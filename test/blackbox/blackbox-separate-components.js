var async = require('async');
var chai = require('chai');
var expect = chai.expect;
var child_process = require('child_process');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var spawn = require('../lib/spawn');
var gearman = require('gearman-coffee');
var fs = require('fs');
var MultiserverWorker = require('../../lib/gearman/multiserver-worker')
  .MultiserverWorker;
var MultiserverClient = require('../../lib/gearman/multiserver-client')
  .MultiserverClient;

chai.should();
chai.use(sinonChai);

suite('blackbox: separate gearslothd processes', function() {
  suite('when a single instance is spawned', function() {

    this.timeout(5000);

    var port = 54730
    var conf = {
      db: 'sqlite',
      dbopt: {
        poll_timeout: 100
      },
      servers: [{
        host: 'localhost',
        port: port
      }]
    };
    var gearmand;
    var runner_gsd;
    var injector_gsd;
    var ejector_gsd;
    var controller_gsd;
    var client;
    var worker;

    var immediate_task = {
      func_name:'test',
      payload:'to be executed immediately'
    };

    setup(function(done) {
      async.series([
        function(callback) {
          gearmand = spawn.gearmand(port, callback);
        },
        function(callback) {
          injector_gsd = spawn.gearslothd(conf, callback);
        },
        function(callback) {
          runner_gsd = spawn.gearslothd(conf, callback);
        },
        function(callback) {
          controller_gsd = spawn.gearslothd(conf, callback);
        },
        function(callback) {
          ejector_gsd = spawn.gearslothd(conf, callback);
        }
        ], function() {
          done();
        });
    });

    teardown(function(done) {
      async.series([
        function(callback) {
          worker.socket.on('close', callback);
          worker.disconnect();
        },
        function(callback) {
          client.socket.on('close', callback);
          client.disconnect();
        },
        function(callback) {
          spawn.killall([injector_gsd], callback);
        },
        function(callback) {
          spawn.killall([runner_gsd], callback);
        },
        function(callback) {
          spawn.killall([controller_gsd], callback);
        },
        function(callback) {
          spawn.killall([ejector_gsd], callback);
        },
        function(callback) {
          spawn.killall([gearmand], callback);
        },
        function(callback) {
          setTimeout(function() {
            fs.unlink('/tmp/DelayedTasks.sqlite', function(err) {
            });
            fs.unlink('/tmp/DelayedTasks.sqlite-journal', function(err) {
              callback();
            });
          }, 500);
        }
        ], function() {
          done();
        })
    });

    test('shuold execute a simple task immediately', function(done){
      this.timeout(200);
      client = new gearman.Client({port:port});
      worker = new gearman.Worker('test', function(payload, worker) {
        var payload = payload.toString();
        expect(payload).to.equal(immediate_task.payload);
        done();
      }, {port:port});
      worker.on('connect', function(){
        client.submitJob('submitJobDelayed', JSON.stringify(immediate_task));
      });
      
    });

  });

  suite('when multiple instances of everything are spawned', function() {
    this.timeout(5000);

    var port1 = 54731
    var port2 = 54732
    var port3 = 54733
    var conf = {
      db: 'sqlite',
      dbopt: {
        poll_timeout: 100
      },
      servers: [
      { host: 'localhost',
        port: port1 },
      { host: 'localhost',
        port: port2 },
      { host: 'localhost',
        port: port3 }]
    };
    var gearmand1;
    var gearmand2;
    var gearmand3;
    var runner_gsd1;
    var runner_gsd2;
    var runner_gsd3;
    var injector_gsd1;
    var injector_gsd2;
    var injector_gsd3;
    var ejector_gsd1;
    var ejector_gsd2;
    var ejector_gsd3;
    var controller_gsd1;
    var controller_gsd2;
    var controller_gsd3;
    var client;
    var worker1;
    var worker2;
    var worker3;

    var test_function = function(done, payload, worker) {
      var payload = payload.toString();
      worker.complete();
      expect(payload).to.equal(immediate_task.payload);
      done();
    };

    var test_function2 = function(done, payload, worker) {
      var payload = payload.toString();
      if (worker) worker.complete();
      expect(payload).to.equal(delayed_task.payload);
      done();
    };

    var immediate_task = {
      func_name:'test',
      payload: 'to be executed immediately'
    };

    var delayed_task = {
      func_name: 'test',
      payload: 'task delayed about 6 seconds',
      after: 6
    }

    setup(function(done) {
      async.series([
        function(callback) {
          gearmand1 = spawn.gearmand(port1, function(){});
          gearmand2 = spawn.gearmand(port2, function(){});
          gearmand3 = spawn.gearmand(port3, callback);
        },
        function(callback) {
          injector_gsd1 = spawn.gearslothd(conf, function(){});
          injector_gsd2 = spawn.gearslothd(conf, function(){});
          injector_gsd3 = spawn.gearslothd(conf, callback);
        },
        function(callback) {
          runner_gsd1 = spawn.gearslothd(conf, function(){});
          runner_gsd2 = spawn.gearslothd(conf, function(){});
          runner_gsd3 = spawn.gearslothd(conf, callback);
        },
        function(callback) {
          controller_gsd1 = spawn.gearslothd(conf, function(){});
          controller_gsd2 = spawn.gearslothd(conf, function(){});
          controller_gsd3 = spawn.gearslothd(conf, callback);
        },
        function(callback) {
          ejector_gsd1 = spawn.gearslothd(conf, function(){});
          ejector_gsd2 = spawn.gearslothd(conf, function(){});
          ejector_gsd3 = spawn.gearslothd(conf, callback);
        }
        ], function() {
          done();
        });
    });

    teardown(function(done) {
      this.timeout(10000);
      async.series([
        function(callback) {
          worker1.on('disconnect', callback);
          worker1.disconnect();
        },
        function(callback) {
          worker2.on('disconnect', callback);
          worker2.disconnect();
        },
        function(callback) {
          worker3.on('disconnect', callback);
          worker3.disconnect();
        },
        function(callback) {
          client.on('disconnect', callback);
          client.disconnect();
        },
        function(callback) {
          spawn.killall([injector_gsd3], callback);
        },
        function(callback) {
          spawn.killall([injector_gsd2], callback);
        },
        function(callback) {
          spawn.killall([injector_gsd1], callback);
        },
        function(callback) {
          spawn.killall([runner_gsd1], callback);
        },
        function(callback) {
          spawn.killall([runner_gsd2], callback);
        },
        function(callback) {
          spawn.killall([runner_gsd3], callback);
        },
        function(callback) {
          spawn.killall([controller_gsd1], callback);
        },
        function(callback) {
          spawn.killall([controller_gsd2], callback);
        },
        function(callback) {
          spawn.killall([controller_gsd3], callback);
        },
        function(callback) {
          spawn.killall([ejector_gsd1], callback);
        },
        function(callback) {
          spawn.killall([ejector_gsd2], callback);
        },
        function(callback) {
          spawn.killall([ejector_gsd3], callback);
        },
        function(callback) {
          spawn.killall([gearmand1], callback);
        },
        function(callback) {
          spawn.killall([gearmand2], callback);
        },
        function(callback) {
          spawn.killall([gearmand3], callback);
        },
        function(callback) {
          setTimeout(function() {
            fs.unlink('/tmp/DelayedTasks.sqlite', function(err) {
            });
            fs.unlink('/tmp/DelayedTasks.sqlite-journal', function(err) {
              callback();
            });
          }, 500);
        }
        ], function() {
          done();
        })
    });

    test('shuold execute a simple task immediately', function(done){
      this.timeout(1000);
      async.series([
        function(callback) {
          client = new MultiserverClient(conf.servers);
          client.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          worker1 = new MultiserverWorker(conf.servers, 'test', test_function.bind(null, done));
          worker1.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          worker2 = new MultiserverWorker(conf.servers, 'test', test_function.bind(null, done));
          worker2.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          worker3 = new MultiserverWorker(conf.servers, 'test', test_function.bind(null, done));
          worker3.on('connect', function(){
            client.submitJob('submitJobDelayed', JSON.stringify(immediate_task));
          });
        }]);
    });

    test('shuold execute a task on expiry', function(done){
      this.timeout(10000);
      var spy = sinon.spy(test_function2);
      async.series([
        function(callback) {
          client = new MultiserverClient(conf.servers);
          client.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          worker1 = new MultiserverWorker(conf.servers, 'test', test_function2.bind(null, done));
          worker1.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          worker2 = new MultiserverWorker(conf.servers, 'test', test_function2.bind(null, done));
          worker2.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          worker3 = new MultiserverWorker(conf.servers, 'test', test_function2.bind(null, done));
          worker3.on('connect', function(){
            client.submitJob('submitJobDelayed', JSON.stringify(delayed_task));
            setTimeout(function(){
              spy.should.not.have.been.called;
            }, 5000)
          });
        }]);
    });

  });
});
