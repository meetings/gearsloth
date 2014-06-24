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

chai.should();

suite.only('Docker test: load test', function(){
  var gearman_ip;
  var gearslothd_config = {
    db:'mysql-multimaster'
  };

  var worker1;
  var worker2;
  var client;

  setup(function(done) {
    this.timeout(10000);
    async.series([
      function(callback) {
        async.parallel([
          function(callback) {
            containers.multimaster_mysql(function(err, config) {
              gearslothd_config = merge(gearslothd_config, {dbopt: config});
              callback();
            });
          },
          function(callback) {
            containers.gearmand([
              'gearmand',
              '--verbose', 'INFO',
              '-l', 'stderrr'
              ], true, function(config) {
                gearslothd_config.servers = config;
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
          client.socket.on('close', function(){
            callback();
          })
          client.disconnect();
        } else {
          callback();
        }
      },
      function(callback) {
        if (worker1) {
          worker1.socket.on('close', function() {
            callback();
          });
          worker1.disconnect();
        } else {
          callback();
        }
      },
      function(callback) {
        if (worker2) {
          worker2.socket.on('close', function() {
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

  test('with 10 tasks submitted simultaneously, immediate tasks are executed', function(done) {
    var task_counter = 0;
    this.timeout(10000);

    async.series([
      function(callback_outer) {
        async.series([
          function(callback) {
            worker1 = new gearman.Worker('test', function(payload, worker){
              payload = payload.toString();
              console.log(task_counter++);
              expect(payload).to.equal(simple_task.payload);
              if (task_counter === 10) {
                done();
              }
              worker.complete();
            }, {port: gearslothd_config.servers[0].port,
              host: gearslothd_config.servers[0].host
            });
            worker1.on('connect', function() {
              callback();
            });
          },function(callback) {
            worker2 = new gearman.Worker('test', function(payload, worker){
              payload = payload.toString();
              console.log(task_counter++);
              expect(payload).to.equal(simple_task.payload);
              if (task_counter === 10) {
                done();
              }
              worker.complete();
            }, {port: gearslothd_config.servers[0].port,
              host: gearslothd_config.servers[0].host
            });
            worker2.on('connect', function() {
              callback();
            });
          },
          function(callback) {
            client = new gearman.Client({port: gearslothd_config.servers[0].port,
              host: gearslothd_config.servers[0].host
            });
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
