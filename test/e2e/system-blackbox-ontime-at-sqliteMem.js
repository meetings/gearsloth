var async = require('async');
var chai = require('chai');
var expect = chai.expect;
var Ejector = require('../../lib/daemon/ejector').Ejector;
var Runner = require('../../lib/daemon/runner').Runner;
var Injector = require('../../lib/daemon/injector').Injector;
var gearman = require('gearman-coffee');
var spawn = require('../lib/spawn');
var child_process = require('child_process');
var sqlite = require('../../lib/adapters/sqlite');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var Retry = require('../../lib/controllers/retry').Retry;

chai.should();
chai.use(sinonChai);

suite('blackbox: at on-time with sqlite :memory:', function() {

  this.timeout(5000);

  var port = 54730;
  var gearmand;
  var injector;
  var ejector;
  var runner;
  var client;
  var worker;
  // var worker_fail;
  var controller;

  var port;
  var conf = {
    dbopt: {
      poll_timeout:50,
      db_name:':memory:'
    },
    servers: [{
      host:'localhost',
      port: port
    }]
  };

  var at_2000_task = {
    func_name:'test',
    payload:'blackbox-6000-ms-delay',
    // at:time_in_future will be set in the test to circumvent some weird shit
  };
  var after_and_at_task = {
    func_name:'test',
    payload:'blackbox-after-supersedes',
    at:new Date(),
    after:6
  };

  setup(function(done) {
    async.series([
      function(callback) {
        sqlite.initialize(conf, function(err, dbconn) {
            if (err) {
              console.log(err, dbconn);
              done("Error initializing database");
              return;
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
      })
  });

  teardown(function(done) {
    async.series([
      function(callback) {
        runner.on('disconnect', function() {
          callback();
        })
        runner.stop();
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
        client.on('disconnect', function() {
          callback();
        });
        client.disconnect();
      },
      function(callback) {
        if (worker) {
          worker.on('disconnect', function() {
            callback();
          });
          worker.disconnect();
        } else {
          callback();
        }
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

  test('task is recieved in bottom level worker after timeout expires', function(done){
    var time_in_future = new Date();
    time_in_future.setSeconds(time_in_future.getSeconds() + 6 );

    this.timeout(10000);
    client = new gearman.Client({port:port});
    var worker_fail = new gearman.Worker('test', function(payload, worker) {
      done(new Error('task arrived too quickly'));
    }, {port:port});
    worker_fail.on('connect', function(){
        task_sent = true;
        at_2000_task.at = time_in_future;
        client.submitJob('submitJobDelayed', JSON.stringify(at_2000_task));
    });

    setTimeout(function() {
      async.series([
        function(callback) {
          worker_fail.socket.on('close', function(){
            callback();
          });
          worker_fail.disconnect();
        },
        function(callback) {
          worker = new gearman.Worker('test', function(payload, worker) {
            var payload = payload.toString();
            worker.complete();
            expect(payload).to.equal(at_2000_task.payload);
            done();
            callback();
          }, {port:port});
        }]);
    }, 5000);
  });

  test('task is scheduled according to after if after and at are both specified', function(done){
    this.timeout(10000);
    client = new gearman.Client({port:port});
    var worker_2_fail = new gearman.Worker('test', function(payload, worker) {  
      done(new Error('task arrived too quickly'));
    }, {port:port});
    worker_2_fail.on('connect', function(){
        task_sent = true;
        client.submitJob('submitJobDelayed', JSON.stringify(after_and_at_task));
    });

    setTimeout(function() {
      async.series([
        function(callback) {
          worker_2_fail.socket.on('close', function(){  
            callback();
          });
          worker_2_fail.disconnect();
        },
        function(callback) {
          worker = new gearman.Worker('test', function(payload, worker) {
            var payload = payload.toString();
            worker.complete();
            expect(payload).to.equal(after_and_at_task.payload);
            done();
            callback();
          }, {port:port});
        }]);
    }, 5000);
  });

});
