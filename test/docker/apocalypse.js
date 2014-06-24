var async = require('async')
  , chai = require('chai')
  , expect = chai.expect
  , gearman = require('gearman-coffee')
  , Docker = require('dockerode')
  , docker = new Docker({socketPath: '/var/run/docker.sock'})
  , net = require('net')
  , fs = require('fs')
  , containers = require('./containers')
  , merge = require('../../lib/merge')
  , random = Math.random;

chai.should();


/*
 * ~ Mission briefing ~
 * 1. There is one of each component
 * 2. Everything expect mysql fails
 *
 * ~ Goal ~
 * The task must be executed.
 */

suite('(docker) on apocalypse', function() {
  var container_array = [];
  var gearslothd_config;
  var gearslothd_config = {
    verbose: 0,
    db:'mysql-multimaster',
  };
  var gearmand1_container;
  var gearmand0_container;
  suiteSetup(function(done) {
    this.timeout(10000);
    async.series([
      function(callback) {
        async.parallel([
          function(callback) {
            containers.multimaster_mysql(function(err, config) {
              gearslothd_config = merge(gearslothd_config, {dbopt:config});
              callback();
            });
          },
          function(callback) {
            containers.gearmand(null,
              true, function(config, container) {
              gearslothd_config.servers = config;
              container_array.push(container);
              callback();
            });
          }], function() { callback() });
        },
        function(callback) {
          container_array =
            startGearslothStack(
              gearslothd_config,
              container_array,
              function(container_arr) {
                container_array = container_arr
                callback()
              });
        }],
      done);
  });

  suiteTeardown(function(done) {
    this.timeout(10000);
    containers.stopAndRemoveAll(done);
  });
  test('everything expect mysql fails, task is still executed', function(done) {
    this.timeout(10000);
    var gearmand0_host = gearslothd_config.servers[0].host;
    var sent_payload = {
      func_name:'test',
      payload:new Date().toISOString() + ' the dead will walk the earth',
      runner_retry_timeout:1,
      runner_retry_count:10,
      retry_timeout:1,
      retry_count:10
    };
    var work_handler = function() {};
    var client = new gearman.Client({host:gearmand0_host});

    
    client.submitJob('submitJobDelayed', JSON.stringify(sent_payload))
    .on('complete', function() {
      setTimeout(function() {
        async.each(container_array, function(container, callback) {
          container.kill(function() {
            container.remove(function() {
              callback();
            });
          });
        }, function() {
          async.series([
            function(callback) {
              containers.gearmand(null,
                true, function(config, container) {
                  gearslothd_config.servers = config;
                  gearmand0_host = config[0].host;
                  callback();
                });
            },
            function(callback) {
              new gearman.Worker('test', function(payload, worker) {
                expect(payload.toString()).to.equal(sent_payload.payload);
                setTimeout(done, 100);
                worker.complete();
              }, {host:gearmand0_host})
              .on('connect', callback);
            },
            function(callback) {
              startGearslothStack(gearslothd_config, [], function() { callback() });
            }]);
        });
      }, Math.floor(random()*3000)); // we don't quite know when the apocalypse comes
    });
  });
});

function startGearslothStack(gearslothd_config, container_array, callback) {
  async.parallel([
    function(callback) {
      containers.gearslothd(
        merge(gearslothd_config, {injector:true})
        , true, function(container) {
         container_array.push(container);
         callback(); 
        });
    },
    function(callback) {
      containers.gearslothd(
        merge(gearslothd_config, {runner:true})
        , true, function(container) {
         container_array.push(container);
         callback(); 
        });
    },
    function(callback) {
      containers.gearslothd(
        merge(gearslothd_config, {ejector:true})
        , true, function(container) {
          container_array.push(container);
          callback(); 
        });
    },
    function(callback) {
      containers.gearslothd(
          merge(gearslothd_config, {controller:true})
          , true, function(container) {
          container_array.push(container);
          callback(); 
        });
    }], function() { callback(container_array) });
}
