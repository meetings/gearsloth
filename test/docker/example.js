var async = require('async')
  , chai = require('chai')
  , expect = chai.expect
  , gearman = require('gearman-coffee')
  , Docker = require('dockerode')
  , docker = new Docker({socketPath: '/var/run/docker.sock'})
  , net = require('net')
  , fs = require('fs')
  , containers = require('./containers')
  , merge = require('../../lib/merge');

chai.should();

suite.only('docker-example', function() {
  var gearmand_ip;
  var gearslothd_config = {
    verbose: 2,
    db:'mysql-multimaster'
  };
  setup(function(done) {
    this.timeout(10000);
    async.series([
      function(callback) {
        console.log('starting mysqld...');
        containers.multimaster_mysql(function(err, config) {
          gearslothd_config = merge(gearslothd_config, {dbopt: config});
          callback();
        });
      },
      function(callback) {
        containers.gearmand(['gearmand', 
          '--verbose', 'INFO', 
          '-l', 'stderr'],
          true, function(config) {
          gearslothd_config.servers = config;
          gearslothd_config.servers[0].debug = true;
          callback();
        });
      },
      function(callback) {
        console.log(gearslothd_config);
        containers.gearslothd(
          merge(gearslothd_config, {injector:true})
          , true, function() {
           callback(); 
          });
      },
      function(callback) {
        containers.gearslothd(
          merge(gearslothd_config, {runner:true})
          , true, function() {
           callback(); 
          });
      },
      function(callback) {
        containers.gearslothd(
          merge(gearslothd_config, {ejector:true})
          , true, function() {
            callback(); 
          });
      },
      function(callback) {
        containers.gearslothd(
            merge(gearslothd_config, {controller:true})
            , true, function() {
            callback(); 
          });
      }],
    done);
  });

  teardown(function(done) {
    this.timeout(20000);
    containers.stopAndRemoveAll(done);
  });
  test('test', function(done) {
    this.timeout(5000);
    var sent_payload = new Date().toISOString();
    var work_handler = function() {};
    var client = new gearman.Client(gearslothd_config.servers[0]);
    var worker = new gearman.Worker('test', function(payload, worker) {
      expect(payload.toString()).to.equal(sent_payload);
      setTimeout(done, 100);
      worker.complete();
    }, gearslothd_config.servers[0]);
    client.submitJob('submitJobDelayed', JSON.stringify({
      func_name:'test',
      payload:sent_payload
    }))
  });
});

