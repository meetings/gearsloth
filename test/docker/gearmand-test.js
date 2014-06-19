var async = require('async')
  , chai = require('chai')
  , expect = chai.expect
  , gearman = require('gearman-coffee')
  , Docker = require('dockerode')
  , docker = new Docker({socketPath: '/var/run/docker.sock'})
  , net = require('net')
  , fs = require('fs')
  , containers = require('./containers');

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
  var gearmand_config = [];
  var mysqld_config = {};
  var gearmand1_container;
  setup(function(done) {
    this.timeout(10000);
    async.series([
      function(callback) {
        console.log('starting mysqld...');
        containers.multimaster_mysql(function(err, config) {
          mysqld_config = config;
          callback();
        });
      },
      function(callback) {
        containers.gearmand(['gearmand', '--verbose', 'INFO', '-l', 'stderr'],
          true, function(config) {
          gearmand_config.push(config);
          callback();
        });
      },
      function(callback) {
        containers.gearmand(['gearmand', '--verbose', 'INFO', '-l', 'stderr'],
          true, function(config, container) {
          gearmand_config.push(config);
          gearmand1_container = container;
          callback();
        });
      },
      function(callback) {
        containers.gearslothd([
          'gearslothd', '-vv', '-i',
          '--db=mysql-multimaster',
          '--dbopt='+JSON.stringify(mysqld_config),
          '--servers='+JSON.stringify(gearmand_config)
          ], true, function() {
           callback(); 
          });
      },
      function(callback) {
        containers.gearslothd([
          'gearslothd', '-v', '-r',
          '--db=mysql-multimaster',
          '--dbopt='+JSON.stringify(mysqld_config),
          '--servers='+JSON.stringify(gearmand_config)
          ], true, function() {
           callback(); 
          });
      },
      function(callback) {
        containers.gearslothd([
          'gearslothd', '-v', '-e',
          '--db=mysql-multimaster',
          '--dbopt='+JSON.stringify(mysqld_config),
          '--servers='+JSON.stringify(gearmand_config)
          ], true, function() {
            callback(); 
          });
      },
      function(callback) {
        containers.gearslothd([
          'gearslothd', '-v', '-c',
          '--servers='+JSON.stringify(gearmand_config)
          ], true, function() {
            callback(); 
          });
      }],
    done);
  });

  teardown(function(done) {
    this.timeout(10000);
    containers.stopAndRemoveAll(done);
  });
  test('one goes down, task is still executed', function(done) {
    this.timeout(5000);
    var sent_payload = new Date().toISOString();
    var work_handler = function() {};
    var client = new gearman.Client({host:gearmand_config[0].host, debug:true});

    var worker = new gearman.Worker('test', function(payload, worker) {
      expect(payload.toString()).to.equal(sent_payload);
      setTimeout(done, 100);
      worker.complete();
    }, {host:gearmand_config[0].host, debug:true})
    
    .on('connect', function() {
      console.log('----- KILLING GEARMAND CONTAINER -----');
      gearmand1_container.kill(function(err, data) {
        if(err) console.log(err);
        client.submitJob('submitJobDelayed', JSON.stringify({
          func_name:'test',
          payload:sent_payload
        }))
      });
    });
  });
});

