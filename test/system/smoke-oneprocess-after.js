var async = require('async');
var chai = require('chai');
var expect = chai.expect;
var Ejector = require('../../lib/daemon/ejector').Ejector;
var Runner = require('../../lib/daemon/runner').Runner;
var Injector = require('../../lib/daemon/injector').Injector;
var gearman = require('gearman-node');
var spawn = require('../lib/spawn');
var child_process = require('child_process');
var sqlite = require('../../lib/adapters/sqlite');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var Retry = require('../../lib/controllers/retry').Retry;

chai.should();
chai.use(sinonChai);

suite('blackbox: on-time with sqlite :memory: "after" parameter ', function() {

  this.timeout(5000);

  var port = 54730;
  var gearmand;
  var injector;
  var ejector;
  var runner;
  var client;
  var worker;
  var controller;

  var port;
  var conf = {
    dbopt: {
      poll_timeout:0,
      database_file:':memory:'
    },
    servers: [{
      host:'localhost',
      port: port
    }]
  };

  var simple_task = {
    func_name:'test',
    payload:'blackbox-immediate'
  };
  var after_2_task = {
    func_name:'test',
    payload:'blackbox-2-second-delay',
    after:2
  };
  var conflict_task = {
    func_name:'test',
    payload:'blackbox-delay-with-conflict',
    after: 2
  };

  var too_early_task = {
    func_name:'test',
    payload:'blackbox-delay-with-conflict',
    after: 6
  }

  setup(function(done) {
    async.series([
      function(callback) {
        sqlite.initialize(conf, function(err, dbconn) {
            if (err) {
              done("Error initializing database");
            }
            conf.dbconn = dbconn;
            sinon.spy(conf.dbconn, 'disableTask');
            sinon.spy(conf.dbconn, 'updateTask');
            sinon.spy(conf.dbconn, 'completeTask');
            sinon.spy(conf.dbconn, 'saveTask');
            sinon.spy(conf.dbconn, 'listenTask');
            callback();
        });
      },
      function(callback) {
        gearmand = spawn.gearmand(port, function(){

          callback();
        });
      },
      function(callback) {
        runner = new Runner(conf);
        runner.on('connect', function(){

          callback();
        });
      },
      function(callback) {
        injector = new Injector(conf);
        injector.on('connect', function() {

          callback();
        });
      },
      function(callback) {
        ejector = new Ejector(conf);
        ejector.on('connect', function() {

          callback();
        });
      },
      function(callback) {
        controller = new Retry(conf);
        controller.on('connect', function(){

          callback();
        });
      }
      ], function() {

        done();
      });
  });

  teardown(function(done) {
    async.series([
      function(callback) {
        runner.on('disconnect', function() {
          callback();
        })
        runner.disconnect();
      },
      function(callback) {
        injector.on('disconnect', function() {
          callback();
        });
        injector.disconnect();
      },
      function(callback) {
        ejector.on('disconnect', function() {
          callback();
        });
        ejector.disconnect();
      },
      function(callback) {
        controller.on('disconnect', function() {
          callback();
        });
        controller.disconnect();
      },
      function(callback) {
        client.socket.on('close', function() {
          callback();
        });
        client.disconnect();
      },
      function(callback) {
        worker.socket.on('close', function() {
          callback();
        });
        worker.disconnect();
      },
      function(callback) {
        spawn.killall([gearmand], function() {
          callback();
        });
      }
      ], function() {
        done();
      });
  });

  test('task is recieved in bottom level worker almost immediately', function(done){
    this.timeout(1000);
    client = new gearman.Client({port:port});
    worker = new gearman.Worker('test', function(payload, worker) {
      var payload = payload.toString();
      expect(payload).to.equal(simple_task.payload);
      done();
    }, {port:port});
    worker.on('connect', function(){
      client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
    });
  });

  test('task is recieved in bottom level worker after timeout expires', function(done){
    this.timeout(5000);
    client = new gearman.Client({port:port});
    worker = new gearman.Worker('test', function(payload, worker) {
      var payload = payload.toString();
      expect(payload).to.equal(after_2_task.payload);
      done();
      worker.complete();
    }, {port:port});
    worker.on('connect', function(){
      client.submitJob('submitJobDelayed', JSON.stringify(after_2_task));
    });
  });

  test('task is recieved on time, regardless of future "at" field', function(done){
    this.timeout(4000);
    var time_in_future = new Date();
    time_in_future.setSeconds(time_in_future.getSeconds() + 10000);
    conflict_task.at = time_in_future.toISOString();
    client = new gearman.Client({port:port});
    worker = new gearman.Worker('test', function(payload, worker) {
      var payload = payload.toString();
      expect(payload).to.equal(conflict_task.payload);
      done();
    }, {port:port});
    worker.on('connect', function(){
      client.submitJob('submitJobDelayed', JSON.stringify(conflict_task));
    });
  });

  test('task is recieved on time, regardless of future "at" field with delay', function(done){
    this.timeout(10000);
    client = new gearman.Client({port:port});
    var failing_worker = new gearman.Worker('test', function(payload, worker) {
      done("task arrived too early");
    }, {port:port});
    failing_worker.on('connect', function(){
      client.submitJob('submitJobDelayed', JSON.stringify(too_early_task));
    });
    setTimeout(function(){
      async.series([
        function(callback) {
          failing_worker.socket.on('close', function(){
            callback();
          });
          failing_worker.disconnect();
        },
        function(callback){
          worker = new gearman.Worker('test', function(payload, worker) {
            worker.complete();
            expect(payload.toString()).to.equal(too_early_task.payload);
            setTimeout(function() {
              callback();
            }, 500);
          }, {port:port});
        }], function() {
          expect(conf.dbconn.saveTask).to.have.been.called;
          expect(conf.dbconn.listenTask).to.have.been.called;
          expect(conf.dbconn.updateTask).to.have.been.called;
          expect(conf.dbconn.completeTask).to.have.been.called;
          done();
        })
    }, 5000)
  });

});
