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


/*
 * ~ Mission briefing ~
 * 1. There is one of each gearslothd components
 * 2. Each of them is connected to two gearman servers
 * 3. One of these servers goes down, while a task is sent from
 *    a top level client to the working server.
 *
 * ~ Goal ~
 * The task must be executed.
 */

suite('(docker) two gearmand servers', function() {
  var gearmand0_host;
  var gearslothd_config;
  var gearslothd_config = {
    verbose: 2,
    db:'mysql-multimaster',
    servers: []
  };
  var gearmand1_container;
  var gearmand0_container;
  suiteSetup(function(done) {
    this.timeout(10000);
    async.series([
      function(callback) {
        async.parallel([
          function(callback) {
            console.log('starting mysqld...');
            containers.multimaster_mysql(function(err, config) {
              gearslothd_config = merge(gearslothd_config, {dbopt: config});
              callback();
            });
          },
          function(callback) {
            containers.gearmand(['gearmand', 
              '--verbose', 'NOTICE', 
              '-l', 'stderr'],
              true, function(config, container) {
              gearslothd_config.servers = gearslothd_config.servers.concat(config);
              gearmand0_host = config[0].host;
              gearmand0_container = container;
              callback();
            });
          },
          function(callback) {
            containers.gearmand(['gearmand', 
              '--verbose', 'NOTICE', 
              '-l', 'stderr'],
              true, function(config, container) {
              gearslothd_config.servers = gearslothd_config.servers.concat(config);
              gearmand1_container = container;
              callback();
          });
        }], function() { callback() });
      },
      function(callback) {
        async.parallel([
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
          }], function() { callback() });
      }],
    done);
  });

  suiteTeardown(function(done) {
    this.timeout(10000);
    containers.stopAndRemoveAll(done);
  });
  test('one goes down, task is still executed', function(done) {
    this.timeout(5000);
    var sent_payload = new Date().toISOString();
    var work_handler = function() {};
    var client = new gearman.Client({host:gearmand0_host});

    var worker = new gearman.Worker('test1', function(payload, worker) {
      expect(payload.toString()).to.equal(sent_payload);
      setTimeout(done, 100);
      worker.complete();
    }, {host:gearmand0_host})
    
    .on('connect', function() {
      console.log('----- KILLING GEARMAND CONTAINER 1 -----');
      gearmand1_container.kill(function(err, data) {
        if(err) console.log(err);
        gearmand1_container.remove(function(err, data) {
          if(err) console.log(err);
          client.submitJob('submitJobDelayed', JSON.stringify({
            func_name:'test1',
            payload:sent_payload
          }))
        });
      });
    });
  });
});

