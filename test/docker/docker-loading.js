var async = require('async');
var chai = require('chai');
var expect = chai.expect;
var gearman = require('gearman-coffee');
var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var net = require('net');
var fs = require('fs');
var containers = require('./containers');
var merge = require('../../lib/merge');
var MultiserverClient = require('../../lib/gearman/multiserver-client')
  .MultiserverClient;
var MultiserverWorker = require('../../lib/gearman/multiserver-worker')
  .MultiserverWorker;

chai.should();

suite.only('Docker test: load test', function(){
  var gearman_ip;
  var gearslothd_config = {
    db:'mysql-multimaster'
  };

  var worker1;
  var worker2;
  var client;
  var task_counter;

  setup(function(done) {
    this.timeout(10000);
    async.series([
      function(callback) {
        async.parallel([
          function(callback) {
            task_counter = 0;
            containers.multimaster_mysql(function(err, config) {
              gearslothd_config = merge(gearslothd_config, {dbopt: config});
              callback();
            });
          },
          function(callback) {
            containers.gearmand([], true, function(config) {
              if (!gearslothd_config.servers) {
                gearslothd_config.servers = config;
              } else {
                gearslothd_config.servers[1] = config[0];
              }
              callback();
            });
          },
          function(callback) {
            containers.gearmand([], true, function(config) {
              if (!gearslothd_config.servers) {
                gearslothd_config.servers = config;
              } else {
                gearslothd_config.servers[1] = config[0];
              }
              callback();
            });
          }
        ], callback);
      },
    function(callback) {
      async.parallel([
        function(callback) {
          containers.gearslothd(
            merge(gearslothd_config, {injector: true})
            , true, function() {
              callback();
            });
        },
        function(callback) {
          containers.gearslothd(
            merge(gearslothd_config, {injector: true})
            , true, function() {
              callback();
            });
        },
        function(callback) {
          containers.gearslothd(
            merge(gearslothd_config, {runner: true})
            , true, function() {
              callback();
            });
        },
        function(callback) {
          containers.gearslothd(
            merge(gearslothd_config, {runner: true})
            , true, function() {
              callback();
            });
        },
        function(callback) {
          containers.gearslothd(
            merge(gearslothd_config, {ejector: true})
            , true, function() {
              callback();
            });
        },
        function(callback) {
          containers.gearslothd(
            merge(gearslothd_config, {ejector: true})
            , true, function() {
              callback();
            });
        },
        function(callback) {
          containers.gearslothd(
            merge(gearslothd_config, {controller: true})
            , true, function() {
              callback();
            });
        },
        function(callback) {
          containers.gearslothd(
            merge(gearslothd_config, {controller: true})
            , true, function() {
              callback();
            });
        }
        ], callback);
      }
    ], done);
  });

  teardown(function(done) {
    this.timeout(30000);
    async.series([
      function(callback) {
        if (client) {
          client.on('disconnect', function(){
            callback();
          })
          client.disconnect();
        } else {
          callback();
        }
      },
      function(callback) {
        if (worker1) {
          worker1.on('disconnect', function() {
            callback();
          });
          worker1.disconnect();
        } else {
          callback();
        }
      },
      function(callback) {
        if (worker2) {
          worker2.on('disconnect', function() {
            callback();
          });
          worker2.disconnect();
        } else {
          callback();
        }
      },
      function(callback) {
        setTimeout(function() {
          containers.stopAndRemoveAll(done);
          callback();
        }, 500);
      }
      ]);
  });

  var simple_task = {
    func_name : 'test',
    payload : 'test payload'
  };

  var test_func1 = function(done, payload, worker){
    payload = payload.toString();
    expect(payload).to.equal(simple_task.payload);
    ++task_counter;
    if (task_counter >= 10) {
      done();
    }
    worker.complete();
  };

  var test_func2 = function(done, payload, worker){
    payload = payload.toString();
    expect(payload).to.equal(simple_task.payload);
    ++task_counter;
    if (task_counter >= 10) {
      done();
    }
    worker.complete();
  };

  test('with 10 tasks submitted simultaneously, immediate tasks are executed', function(done) {
    this.timeout(20000);

    async.series([
      function(callback_outer) {
        async.parallel([
          function(callback) {
            worker1 = new MultiserverWorker(gearslothd_config.servers, 'test', test_func1.bind(null, done));
            worker1.on('connect', function() {
              callback();
            });
          },
          function(callback) {
            worker2 = new MultiserverWorker(gearslothd_config.servers, 'test', test_func2.bind(null, done));
            worker2.on('connect', function() {
              callback();
            });
          },
          function(callback) {
            client = new MultiserverClient(gearslothd_config.servers);
            client.on('connect', function() {
              callback();
            });
          }, 
          function(callback) {
            callback_outer();
            callback();
          }]);
      },
      function(callback_outer) {
        async.parallel([
          function(callback) {
            client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
            callback();
          },
          function(callback) {
            client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
            callback();
          },
          function(callback) {
            client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
            callback();
          },
          function(callback) {
            client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
            callback();
          },
          function(callback) {
            client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
            callback();
          },
          function(callback) {
            client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
            callback();
          },
          function(callback) {
            client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
            callback();
          },
          function(callback) {
            client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
            callback();
          },
          function(callback) {
            client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
            callback();
          },
          function(callback) {
            client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
            callback();
          },
          function(callback) {
            callback_outer();
            callback();
          }
          ]);
      }]);
  });
});
