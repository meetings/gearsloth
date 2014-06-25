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
var merge = require('../../lib/merge');

chai.should();
chai.use(sinonChai);

suite('blackbox: separate gearslothd processes', function() {
  suite('when a single instance is spawned', function() {

    this.timeout(5000);

    var port = 54730
    var conf = {
      db: 'sqlite',
      dbopt: {
        poll_timeout: 100,
        db_name: '/tmp/delayed-tasks.sqlite'
      },
      servers: [{
        host: 'localhost',
        port: port
      }]
    };

    var injector_gsd_conf = merge(conf, {injector: true});
    var runner_gsd_conf = merge(conf, {runner: true});
    var ejector_gsd_conf = merge(conf, {ejector: true});
    var controller_gsd_conf = merge(conf, {controller: true});

    var gearmand;
    var runner_gsd;
    var injector_gsd;
    var ejector_gsd;
    var controller_gsd;
    var client;
    var worker;

    var immediate_task = {
      retry_count: 1,
      func_name:'test',
      payload:'to be executed immediately'
    };

    setup(function(done) {
      async.series([
        function(callback) {
          gearmand = spawn.gearmand(port, function(){
            callback();
          });
        },
        function(callback) {
          injector_gsd = spawn.gearslothd(injector_gsd_conf, function(){
            callback();
          });
        },
        function(callback) {
          runner_gsd = spawn.gearslothd(runner_gsd_conf, function(){
            callback();
          });
        },
        function(callback) {
          controller_gsd = spawn.gearslothd(controller_gsd_conf, function(){
            callback();
          });
        },
        function(callback) {
          ejector_gsd = spawn.gearslothd(ejector_gsd_conf, function(){
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
            fs.unlink('/tmp/delayed-tasks.sqlite', function(err) {
            });
            fs.unlink('/tmp/delayed-tasks.sqlite-journal', function(err) {
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
        poll_timeout: 100,
        db_name: '/tmp/delayed-tasks.sqlite'
      },
      servers: [
      { host: 'localhost',
        port: port1 },
      { host: 'localhost',
        port: port2 },
      { host: 'localhost',
        port: port3 }]
    };

    var runner_gsd_conf = merge(conf, {runner:true});
    var injector_gsd_conf = merge(conf, {injector: true});
    var ejector_gsd_conf = merge(conf, {ejector: true});
    var controller_gsd_conf = merge(conf, {controller:true});

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
    var time_reference;

    var immediate_task = {
      retry_count: 1,
      func_name:'test',
      payload: 'to be executed immediately'
    };

    var delayed_task_after = {
      retry_count: 1,
      func_name: 'test',
      payload: 'task delayed about 5 seconds',
      after: 6
    };

    var delayed_task_at = {
      retry_count: 1,
      func_name: 'test',
      payload: 'task delayed about 5 seconds',
      // after: to be se in test to circumvent oddities
    };

    setup(function(done) {
      async.series([
        function(callback) {
          gearmand1 = spawn.gearmand(port1, callback);
        },
        function(callback) {
          gearmand2 = spawn.gearmand(port2, callback);
        },
        function(callback) {
          gearmand3 = spawn.gearmand(port3, callback);
        },
        function(callback) {
          injector_gsd1 = spawn.gearslothd(injector_gsd_conf, callback);
        },
        function(callback) {
          injector_gsd2 = spawn.gearslothd(injector_gsd_conf, callback);
        },
        function(callback) {
          injector_gsd3 = spawn.gearslothd(injector_gsd_conf, callback);
        },
        function(callback) {
          runner_gsd1 = spawn.gearslothd(runner_gsd_conf, callback);
        },
        function(callback) {
          runner_gsd2 = spawn.gearslothd(runner_gsd_conf, callback);
        },
        function(callback) {
          runner_gsd3 = spawn.gearslothd(runner_gsd_conf, callback);
        },
        function(callback) {
          controller_gsd1 = spawn.gearslothd(controller_gsd_conf, callback);
        },
        function(callback) {
          controller_gsd2 = spawn.gearslothd(controller_gsd_conf, callback);
        },
        function(callback) {
          controller_gsd3 = spawn.gearslothd(controller_gsd_conf, callback);
        },
        function(callback) {
          ejector_gsd1 = spawn.gearslothd(ejector_gsd_conf, callback);
        },
        function(callback) {
          ejector_gsd2 = spawn.gearslothd(ejector_gsd_conf, callback);
        },
        function(callback) {
          ejector_gsd3 = spawn.gearslothd(ejector_gsd_conf, callback);
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
            fs.unlink('/tmp/delayed-tasks.sqlite', function(err) {
            });
            fs.unlink('/tmp/delayed-tasks.sqlite-journal', function(err) {
              callback();
            });
          }, 500);
        }
        ], function() {
          done();
        })
    });

    var test_imm_func_1 = function(done, payload, worker) {
      var payload = payload.toString();
      worker.complete();
      expect(payload).to.equal(immediate_task.payload);
      done();
    };

    var test_imm_func_2 = function(done, payload, worker) {
      var payload = payload.toString();
      worker.complete();
      expect(payload).to.equal(immediate_task.payload);
      done();
    };

    var test_imm_func_3 = function(done, payload, worker) {
      var payload = payload.toString();
      worker.complete();
      expect(payload).to.equal(immediate_task.payload);
      done();
    };

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
          worker1 = new MultiserverWorker(conf.servers, 'test', test_imm_func_1.bind(null, done));
          worker1.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          worker2 = new MultiserverWorker(conf.servers, 'test', test_imm_func_2.bind(null, done));
          worker2.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          worker3 = new MultiserverWorker(conf.servers, 'test', test_imm_func_3.bind(null, done));
          worker3.on('connect', function(){
            callback();
          });
        }, 
        function(callback) {
          client.submitJob('submitJobDelayed', JSON.stringify(immediate_task));
          callback();
        }
        ]);
    });

    var test__after_func_1 = function(done, payload, worker) {
      var payload = payload.toString();
      if (worker) worker.complete();
      expect(payload).to.equal(delayed_task_after.payload);
      var time_now = new Date();
      if (time_now.getSeconds() - time_reference.getSeconds() <= 4) {
        done(new Error('Task was submitted too early'));
      } else {
        done();
      }
    };

    var test__after_func_2 = function(done, payload, worker) {
      var payload = payload.toString();
      if (worker) worker.complete();
      expect(payload).to.equal(delayed_task_after.payload);
      var time_now = new Date();
      if (time_now.getSeconds() - time_reference.getSeconds() <= 4) {
        done(new Error('Task was submitted too early'));
      } else {
        done();
      }
    };

    var test__after_func_3 = function(done, payload, worker) {
      var payload = payload.toString();
      if (worker) worker.complete();
      expect(payload).to.equal(delayed_task_after.payload);
      var time_now = new Date();
      if (time_now.getSeconds() - time_reference.getSeconds() <= 4) {
        done(new Error('Task was submitted too early'));
      } else {
        done();
      }
    };

    test('shuold execute a task on expiry with after field', function(done){
      this.timeout(10000);

      async.series([
        function(callback) {
          client = new MultiserverClient(conf.servers);
          client.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          worker1 = new MultiserverWorker(conf.servers, 'test', test__after_func_1.bind(null, done));
          worker1.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          worker2 = new MultiserverWorker(conf.servers, 'test', test__after_func_2.bind(null, done));
          worker2.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          worker3 = new MultiserverWorker(conf.servers, 'test', test__after_func_3.bind(null, done));
          worker3.on('connect', function(){
            callback();
          });
        },
        function(callback) {
          client.submitJob('submitJobDelayed', JSON.stringify(delayed_task_after));
          time_reference = new Date();
          callback();
        }]);
    });

    var test__at_func_1 = function(done, payload, worker) {
      var payload = payload.toString();
      if (worker) worker.complete();
      expect(payload).to.equal(delayed_task_at.payload);
      var time_now = new Date();
      if (time_now.getSeconds() - time_reference.getSeconds() <= 4) {
        done(new Error('Task was submitted too early' + time_now +' ' + time_reference));
      } else {
        done();
      }
    };

    var test__at_func_2 = function(done, payload, worker) {
      var payload = payload.toString();
      if (worker) worker.complete();
      expect(payload).to.equal(delayed_task_at.payload);
      var time_now = new Date();
      if (time_now.getSeconds() - time_reference.getSeconds() <= 4) {
        done(new Error('Task was submitted too early' + time_now +' ' + time_reference));
      } else {
        done();
      }
    };

    var test__at_func_3 = function(done, payload, worker) {
      var payload = payload.toString();
      if (worker) worker.complete();
      expect(payload).to.equal(delayed_task_at.payload);
      var time_now = new Date();
      if (time_now.getSeconds() - time_reference.getSeconds() <= 4) {
        done(new Error('Task was submitted too early' + time_now +' ' + time_reference));
      } else {
        done();
      }
    };

    test('shuold execute a task on expiry with at field', function(done){
        this.timeout(10000);

        async.series([
          function(callback) {
            client = new MultiserverClient(conf.servers);
            client.on('connect', function(){
              callback();
            });
          },
          function(callback) {
            worker1 = new MultiserverWorker(conf.servers, 'test', test__at_func_1.bind(null, done));
            worker1.on('connect', function(){
              callback();
            });
          },
          function(callback) {
            worker2 = new MultiserverWorker(conf.servers, 'test', test__at_func_2.bind(null, done));
            worker2.on('connect', function(){
              callback();
            });
          },
          function(callback) {
            worker3 = new MultiserverWorker(conf.servers, 'test', test__at_func_3.bind(null, done));
            worker3.on('connect', function(){
              callback();
            });
          },
          function(callback) {
            var expiry = new Date();
            expiry.setSeconds(expiry.getSeconds() + 5);
            delayed_task_at.at = expiry;
            client.submitJob('submitJobDelayed', JSON.stringify(delayed_task_at));
            time_reference = new Date();
            callback();
          }
          ]);
      });

  });

});
