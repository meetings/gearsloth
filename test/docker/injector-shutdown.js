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

suite('Docker test: killing injectors', function(){
  var gearman_ip;
  var gearslothd_config = {
    db:'mysql-multimaster'
  };

  var injector_container;

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
          '--verbose', 'INFO',
          '-l', 'stderrr'
          ], true, function(config) {
            gearslothd_config.servers = config;
            callback();
          });
      },
      function(callback) {
        containers.gearslothd(
          merge(gearslothd_config, {injector: true})
          , true, function(container) {
            injector_container = container;
            callback();
          }
          );
      },
      function(callback) {
        containers.gearslothd(
          merge(gearslothd_config, {runner: true})
          , true, function() {
            callback();
          }
          );
      },
      function(callback) {
        containers.gearslothd(
          merge(gearslothd_config, {ejector: true})
          , true, function() {  
            callback();
          }
          );
      },
      function(callback) {
        containers.gearslothd(
          merge(gearslothd_config, {controller: true})
          , true, function() {
            callback();
          }
          );
      }], done);
  });

  teardown(function(done) {
    this.timeout(20000);
    containers.stopAndRemoveAll(done);
  });

  test('troll', function(done) {
    async.series([
      function(callback_outer) {
        async.series([
          ]);
      },
      function(callback_outer) {
        async.parallel([
          ]);
      }
      ]);
    done();
  });
});
