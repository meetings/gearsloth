var gearman = require('gearman-coffee')
  , runner = require('../../lib/daemon/runner')
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

describe('(e2e) runner', function() {

  suite('using a stubbed adapter,', function() {

    this.timeout(1000);

    var gearmand;
    var adapter = {};
    var worker;
    var e;
    var conf = { dbconn: adapter,
          servers: [{ host: 'localhost' }]
        }
    var port;
    var runner_in_use;
    var testFunction;

    var new_task1 = {
        controller: 'test',
        func_name: 'log',
        runner_retry_count: 2
    }

    var non_expiring_task1 = {
        id : 2,
        controller: 'test',
        func_name: 'log',
        runner_retry_count: 2
    }

    var expiring_task1 = {
        id : 2,
        controller: 'test',
        func_name: 'log',
        runner_retry_count: 1
    }

    var sample_task1 = {
        id: 666,
        controller: 'test',
        func_name: 'log',
        mikko: 'jussi',
        jeebo: 'jussi'
    }

    setup(function(done) {
      async.series([
        function(callback) {
          port = 6660 + Math.floor(Math.random() * 1000);
          conf.servers[0].port = port;
          callback();
        },
        function(callback) {
          gearmand = spawn.gearmand(port, function(){
            console.log("gearman is up");
            callback();
          });
        }, 
        function (callback) {
          worker = new gearman.Worker('test', testFunction, port)
          .on('connect', function(){
            console.log("worker is running");
            callback();
          });
        },
        ], function() {
          done();
        });
    });

    teardown(function(done) {
      console.log("teardown");
      async.series([
        function (callback) {
          worker.disconnect();
          worker.socket.on('close', function() {
            console.log("worker is dead");
            callback();
          });
        },
        function (callback) {
          runner_in_use.stop();
          console.log("runner is dead");
          callback();
        },
        function (callback) {
          console.log("killing gearmand");
          spawn.killall([gearmand], callback);
        }
        ], function () {
          done();
        });
    });

    test.only('should fetch a task from db and pass it on', function(done) {
      // worker = new gearman.Worker('test', testFunc, { port:port
      // }).on('connect', f);
      // function testFunc(payload, worker) {
      //     var json = JSON.parse(payload.toString());
      //     console.log(json);
      //     expect(json).to.have.property('id', sample_task1.id);
      //     expect(json).to.have.property('func_name', sample_task1.func_name);
      //     f()
      // }
      async.series([
        function (callback) {
          adapter.listenTask = sinon.stub().returns(function() {}).yields(null, sample_task1);
          adapter.updateTask = sinon.stub().yields(null, 1);
          testFunction = function(payload, worker) {
            console.log(payload);
          }
          callback();
        },
        function (callback) {
          runner_in_use = runner(conf)
          .on('connect', function(){
            console.log("runner is up");
            callback();
          });
        }
        ], function() {
          done();
        });

      
    });

    test('should disable task when runner_retry_count reaches 0', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
        var json = JSON.parse(payload.toString());
        adapter.disableTask.should.have.been.calledWith(json);
        done();
      }, { port:port 
      });
      adapter.listenTask = sinon.stub().yields(null, expiring_task1);
      adapter.updateTask = sinon.stub().yields(null, 1);
      adapter.disableTask = sinon.stub().yields(null, 1);
      runner_in_use = runner(conf);
    });

    test('should not disable task when runner_retry_count has time to live', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
        var json = JSON.parse(payload.toString());
        adapter.disableTask.should.not.have.been.calledWith(json);
        done();
      }, { port:port 
      });

      adapter.listenTask = sinon.stub().yields(null, non_expiring_task1);
      adapter.updateTask = sinon.stub().yields(null, 1);
      adapter.disableTask = sinon.stub().yields(null, 1);
      runner_in_use = runner(conf);
    });

    test('should call updateTask when a task is recieved', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
        var json = JSON.parse(payload.toString());
        adapter.updateTask.should.have.been.calledWith(json);
        done();
      }, { port:port
      });
      adapter.listenTask = sinon.stub().yields(null, sample_task1);
      adapter.updateTask = sinon.stub().yields(null, 1);
      runner_in_use = runner(conf);
    });

  });

});
