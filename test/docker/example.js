var async = require('async')
  , chai = require('chai')
  , expect = chai.expect
  , gearman = require('gearman-coffee')
  , Docker = require('dockerode')
  , docker = new Docker({socketPath: '/var/run/docker.sock'});

chai.should();

suite('docker-example', function() {
  setup(function(done) {
    async.series([
      function(callback) {
        docker.createContainer({
          Image:'meetings/gearmand',
          ExposedPorts:'4730/tcp'
          }, function(err, container) {
          if(err) console.log(err);
          container.defaultOptions.start.PortBindings = {
            '4730/tcp': [{ 'HostPort':'11022' }]
            };
          container.start(function(err, data) {
            if(err) console.log(err);
            callback();
          });
        });
      }, function(callback) {
        docker.createContainer({
          Image:'meetings/gearslothd',
          Cmd:'-i localhost:11022'
          }, function(err, container) {
          if(err) console.log(err);
          container.start(function(err, data) {
            if(err) console.log(err);
            callback();
          });
        });
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
            docker.getContainer(containerInfo.Id).stop();
          });
          callback();
        })
      }], done);
  });
  test('test', function() {});
});