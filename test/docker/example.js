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

suite.only('docker-example', function() {
  var gearmand_ip
  var mysqld_config = {};
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
          gearmand_ip = config.host;
          callback();
        });
      },
      function(callback) {
        containers.gearslothd([
          'gearslothd', '-v', '-i',
          '--db=mysql-multimaster',
          '--dbopt='+JSON.stringify(mysqld_config),
          gearmand_ip
          ], true, callback);
      },
      function(callback) {
        containers.gearslothd([
          'gearslothd', '-v', '-r',
          '--db=mysql-multimaster',
          '--dbopt='+JSON.stringify(mysqld_config),
          gearmand_ip
          ], true, callback);
      },
      function(callback) {
        containers.gearslothd([
          'gearslothd', '-v', '-e',
          '--db=mysql-multimaster',
          '--dbopt='+JSON.stringify(mysqld_config),
          gearmand_ip
          ], true, callback);
      },
      function(callback) {
        containers.gearslothd([
          'gearslothd', '-v', '-c',
          gearmand_ip
          ], true, callback);
      }],
    done);
  });

  teardown(function(done) {
    async.series([
      function(callback) {
        docker.listContainers(function (err, containers) {
          if(err) console.log(err);
          containers.forEach(function (containerInfo) {
            console.log('stopping container ' + JSON.stringify(containerInfo));
            docker.getContainer(containerInfo.Id).stop(callback);
          });
        callback();
        })
      }], done);
  });
  test('test', function(done) {
    this.timeout(5000);
    var sent_payload = new Date().toISOString();
    var work_handler = function() {};
    var client = new gearman.Client({host:gearmand_ip, debug:true});
    var worker = new gearman.Worker('test', function(payload, worker) {
      expect(payload.toString()).to.equal(sent_payload);
      setTimeout(done, 100);
      worker.complete();
    }, {host:gearmand_ip, debug:true});
    client.submitJob('submitJobDelayed', JSON.stringify({
      func_name:'test',
      payload:sent_payload
    }))
  });
});

