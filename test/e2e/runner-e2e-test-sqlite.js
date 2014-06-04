var gearman = require('gearman-coffee')
  , Runner = require('../../lib/daemon/runner').Runner
  , child_process = require('child_process')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , expect = chai.expect
  , sqlite = require('../../lib/adapters/sqlite')
  , fs = require('fs');

chai.should();
chai.use(sinonChai);

describe('(e2e) runner', function() {

  suite('runner using a real adapter with no conf,', function() {

    this.timeout(3000);

    var gearmand;
    var adapter = {};
    var worker;
    var e;
    var port;
    var running_runner;

    var config = {
      dbpopt: {poll_timeout : 0},
      servers: [{ host: 'localhost' }]
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

    suiteSetup(function(done) {
      port = 6660 + Math.floor(Math.random() * 1000);
      config.servers[0].port = port;

      gearmand = child_process.exec('gearmand -p ' + port, console.log);
      
      var client = new gearman.Client({port:port});
      client.on('connect', function() {
        running_runner = new Runner(config);
      });

      sqlite.initialize(null, function(err, dbconn) {
        if (err) console.log(err, dbconn);        
        config.dbconn = dbconn;
      });

      setTimeout(function() {
        sinon.spy(config.dbconn, 'disableTask');
        sinon.spy(config.dbconn, 'updateTask');
        sinon.spy(config.dbconn, 'listenTask');
        done();
      }, 2000);
    });

    setup(function () {

    });

    teardown(function(done) {
      worker.disconnect();
      done();
    });

    suiteTeardown(function(done) {
      // worker.disconnect();
      gearmand.kill('SIGKILL');
      setTimeout(function() {
        fs.open('/tmp/DelayedTasks.sqlite', 'r', function(err) {
          if(err) console.log(err);
          fs.unlink('/tmp/DelayedTasks.sqlite', function() {});
          done();
        });
      }, 500);
      
    });

    test('should fetch a task from db and pass it on', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
          var json = JSON.parse(payload.toString());
          expect(json).to.have.property('id');
          expect(json).to.have.property('func_name', sample_task.func_name);
          config.dbconn.completeTask(json, function(err, id){ });
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
        config.dbconn.completeTask(json, function(err, id){});
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
        config.dbconn.completeTask(json, function(err, id){});
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
