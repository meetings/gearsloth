var lib = require( '../../lib/helpers/lib_require' );

var _ = require('underscore');
var async = require('async');
var gearman = require('gearman-node');
var log = lib.require('log').mute();

var spawn = lib.require('test-helpers/spawn');
var adapter_helper = lib.require('test-helpers/adapter-helper');
var worker_helper = lib.require('test-helpers/worker-helper');
var Runner = lib.require('daemon/runner').Runner;

var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;

chai.should();
chai.use(sinonChai);

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
    var runner_in_use;

    var new_task1 = {
        controller: 'test',
        func_name: 'log',
        at : new Date().toISOString(),
        runner_retry_count: 2
    }

    var non_expiring_task1 = {
        id : 2,
        at : new Date().toISOString(),
        controller: 'test',
        func_name: 'log',
        runner_retry_count: 1
    }

    var expiring_task1 = {
        id : 2,
        at : new Date().toISOString(),
        controller: 'test',
        func_name: 'log',
        runner_retry_count: 0
    }

    var sample_task1 = {
        id: 666,
        at : new Date().toISOString(),
        controller: 'test',
        func_name: 'log',
        mikko: 'jussi',
        jeebo: 'jussi'
    }

    setup(function(done) {
      async.series([
        _.partial( spawn.gearmand, port ),
        ], done );
    });

    teardown(function(done) {
      async.series([
        function (callback) {
          worker.disconnect();
          worker.socket.on('close', function() {
            callback();
          });
        },
        _.bind( runner_in_use.disconnect, runner_in_use ),
        spawn.teardown
        ], done );
    });

    test('should reschedule and run task when no runner_retry_count set', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
        var json = JSON.parse(payload.toString());
        expect(json).to.have.property('id', sample_task1.id);
        expect(json).to.have.property('func_name', sample_task1.func_name);
        adapter.updateListenedTask.should.have.been.called;
        adapter.disableListenedTask.should.not.have.been.called;
        done();
      }, { port:port
      });
      adapter.listenTask = sinon.stub().yields(null, sample_task1, 'test', {} );
      adapter.updateListenedTask = sinon.spy( function( task, db_state, callback ) { callback( null, task ); } );
      adapter.disableListenedTask = sinon.spy( function( task, db_state, callback ) { callback( null, task ); } );
      runner_in_use = new Runner(conf);
    });

    test('should run and disable task when runner_retry_count is 0', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
        var json = JSON.parse(payload.toString());
        expect(json).to.have.property('id', expiring_task1.id);
        adapter.updateListenedTask.should.not.have.been.called;
        adapter.disableListenedTask.should.have.been.calledOnce;
        var disabled_task = adapter.disableListenedTask.firstCall.args[0];
        disabled_task.id.should.equal(expiring_task1.id);
        done();
      }, { port:port
      });
      adapter.listenTask = sinon.stub().yields(null, expiring_task1, 'test', {} );
      adapter.updateListenedTask = sinon.spy( function( task, db_state, callback ) { callback( null, task ); } );
      adapter.disableListenedTask = sinon.spy( function( task, db_state, callback ) { callback( null, task ); } );
      runner_in_use = new Runner(conf);
    });

    test('should run and not disable task when runner_retry_count has time to live', function(done) {
      worker = new gearman.Worker('test', function(payload, worker) {
        var json = JSON.parse(payload.toString());
        expect(json).to.have.property('id', non_expiring_task1.id);
        adapter.updateListenedTask.should.have.been.calledOnce;
        adapter.disableListenedTask.should.not.have.been.called;
        done();
      }, { port:port
      });
      adapter.listenTask = sinon.stub().yields(null, non_expiring_task1, 'test', {} );
      adapter.updateListenedTask = sinon.spy( function( task, db_state, callback ) { callback( null, task ); } );
      adapter.disableListenedTask = sinon.spy( function( task, db_state, callback ) { callback( null, task ); } );
      runner_in_use = new Runner(conf);
    });
  });
});
