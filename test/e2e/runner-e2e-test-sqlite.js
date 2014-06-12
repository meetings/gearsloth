var gearman = require('gearman-coffee')
  , Runner = require('../../lib/daemon/runner').Runner
  , child_process = require('child_process')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , expect = chai.expect
  , sqlite = require('../../lib/adapters/sqlite')
  , fs = require('fs')
  , async = require('async')
  , spawn = require('../lib/spawn');

chai.should();
chai.use(sinonChai);

require('../../lib/log').setOutput();

suite('(e2e) runner', function() {

  suite('runner using a real adapter with no conf,', function() {

    this.timeout(4000);

    var port = 54730;
    var gearmand;
    var adapter = {};
    var worker;
    var e;
    var port;
    var running_runner;

    var config = {
      dbpopt: {poll_timeout : 0},
      servers: [{
        host: 'localhost',
        port: port
      }]
    }

    var new_task = {
        controller: 'test',
        func_name: 'log',
        runner_retry_count: 2
    }

    var non_expiring_task = {
        id : 2,
        controller: 'test',
        func_name: 'log',
        runner_retry_count: 2
    }

    var expiring_task = {
        id : 2,
        controller: 'test',
        func_name: 'log',
        runner_retry_count: 1
    }

    var sample_task = {
        id: 666,
        controller: 'test',
        func_name: 'log',
        mikko: 'jussi',
        jeebo: 'jussi'
    }

    setup(function(done) {
      async.series([
        function(callback) {
          gearmand = spawn.gearmand(port, function(){
            callback();
          });
        },
        function(callback) {
          sqlite.initialize(config, function(err, dbconn) {
            if (err) console.log(err, dbconn);        
            config.dbconn = dbconn;
            callback();
          });
        },
        function(callback) {
          sinon.spy(config.dbconn, 'disableTask');
          sinon.spy(config.dbconn, 'updateTask');
          sinon.spy(config.dbconn, 'listenTask');
          callback();
        },
        function(callback) {
          running_runner = new Runner(config);
          running_runner.on('connect', function(){
            callback();
          });
        }
        ], function() {
          done();
        });
    });

    teardown(function(done) {
      async.series([
        function (callback) {
          worker.socket.on('close', function() {
            callback();
          });
          worker.disconnect();
        },
        function (callback) {
          running_runner.on('disconnect', function() {
            callback();
          });
          running_runner.stop(0, function() {});
        },
        function (callback) {
          spawn.killall([gearmand], function() {
            callback();
          });
        },
        function(callback) {
          setTimeout(function() {
            fs.unlink('/tmp/DelayedTasks.sqlite', function(err) {
              if (err) console.log(err);
              callback();
            });
          }, 500);
        }
        ], function () {
          done();
        });
    });

    suiteTeardown(function(done){
      async.series([
        function(callback) {
          // setTimeout(function() {
            fs.unlink('/tmp/DelayedTasks.sqlite', function() {
              callback();
            });
          // }, 500);
        },
        function(callback) {
          // setTimeout(function() {
            fs.unlink('/tmp/DelayedTasks.sqlite-journal', function() {
              callback();
            });
          // }, 500);
        }
        ], function() {
          done();
        });
    });

    test('should fetch a task from db and pass it on', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
          var json = JSON.parse(payload.toString());
          expect(json).to.have.property('id');
          expect(json).to.have.property('func_name', sample_task.func_name);
          done();
        }, { port:port
      });
      config.dbconn.saveTask(sample_task, function(err, id){});
    });

    test('should disable task when runner_retry_count reaches 0', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
        var json = JSON.parse(payload.toString());
        json.at = new Date(json.at);
        json.first_run = new Date(json.first_run);
        config.dbconn.disableTask.should.have.been.calledWith(json);
        done();
      }, { port:port
      });
      config.dbconn.saveTask(expiring_task, function(err, id){});
    });

    test('should not disableTaskble task when runner_retry_count has time to live', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
        var json = JSON.parse(payload.toString());
        json.at = new Date(json.at);
        json.first_run = new Date(json.first_run);
        config.dbconn.disableTask.should.not.have.been.calledWith(json);
        done();
      }, { port:port
      });
      config.dbconn.saveTask(non_expiring_task, function(err, id){});
    });

    test('should call updateTask when a task is recieved', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
        var json = JSON.parse(payload.toString());
        json.at = new Date(json.at);
        json.first_run = new Date(json.first_run);
        config.dbconn.updateTask.should.have.been.calledWith(json);
        config.dbconn.completeTask(json, function(err, id){});
        done();
      }, { port:port
      });
      config.dbconn.saveTask(sample_task, function(err, id){});
    });
  });
});
