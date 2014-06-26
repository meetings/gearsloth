var gearman = require('gearman-coffee')
  , runner = require('../../lib/daemon/runner')
  , child_process = require('child_process')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , expect = chai.expect
  , fs = require('fs')
  , async = require('async')
  , spawn = require('../lib/spawn');

chai.should();
chai.use(sinonChai);

require('../../lib/log').setOutput();

suite('(e2e) runner', function() {

  suite('using a stubbed adapter,', function() {

    this.timeout(4000);

    var port = 54730;
    var gearmand;
    var adapter = {};
    var worker;
    var e;
    var conf = { dbconn: adapter,
          servers: [{
            host: 'localhost',
            port: port
          }]
        };
    var port;
    var runner_in_use;
    
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
          gearmand = spawn.gearmand(port, function(){
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
          worker.disconnect();
          worker.socket.on('close', function() {
            callback();
          });
        },
        function (callback) {
          runner_in_use.on('disconnect', function(){
            callback();
          });
          runner_in_use.stop(0, function(){});
        },
        function (callback) {
          spawn.killall([gearmand], function(){
            callback();
          });
        }
        ], function () {
          done();
        });
    });

    test('should fetch a task from db and pass it on', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
        var json = JSON.parse(payload.toString());
        expect(json).to.have.property('id', sample_task1.id);
        expect(json).to.have.property('func_name', sample_task1.func_name);
        done();
      }, { port:port
      });
      adapter.listenTask = sinon.stub().yields(null, sample_task1);
      adapter.updateTask = sinon.stub().yields(null, 1);
      runner_in_use = runner(conf);
    });

    test('should disable task when runner_retry_count reaches 0', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
        var json = JSON.parse(payload.toString());
        adapter.disableTask.should.have.been.calledOnce;
        var disabled_task = adapter.disableTask.firstCall.args[0];
        disabled_task.id.should.equal(expiring_task1.id);
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
