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

suite('Docker test: killing ejectors', function(){
  var gearman_ip;
  var gearslothd_config = {
    db:'mysql-multimaster'
  };

  var ejector_container;
  var worker;
  var client;

  setup(function(done) {
    this.timeout(10000);
    async.series([
      function(callback) {
        containers.multimaster_mysql(function(err, config) {
          gearslothd_config = merge(gearslothd_config, {dbopt: config});
          callback();
        });
      },
      function(callback) {
        containers.gearmand([
          'gearmand',
          '--verbose', 'NOTICE',
          '-l', 'stderrr'
          ], true, function(config) {
            gearslothd_config.servers = config;
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
          merge(gearslothd_config, {ejector: true})
          , true, function(container) {
            ejector_container = container;
            callback();
          });
      },function(callback) {
        containers.gearslothd(
          merge(gearslothd_config, {ejector: true})
          , true, function(container) {
            callback();
          });
      },
      function(callback) {
        containers.gearslothd(
          merge(gearslothd_config, {controller: true})
          , true, function() {
            callback();
          });
      }], done);
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
        if (worker) {
          worker.socket.on('close', function() {
            callback();
          });
          worker.disconnect();
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

  test('one of two, immediate task is executed', function(done) {
    this.timeout(10000);
    async.series([
      function(callback_outer) {
        async.series([
          function(callback) {
            worker = new gearman.Worker('test', function(payload, worker){
              payload = payload.toString();
              worker.complete();
              expect(payload).to.equal(simple_task.payload);
              done();
            }, {port: gearslothd_config.servers[0].port,
              host: gearslothd_config.servers[0].host
            });
            worker.on('connect', function() {
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
        async.series([
          function(callback) {
            ejector_container.kill(function(){
              ejector_container.remove(function() {
                callback();
              });
            });
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
