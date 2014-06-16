var async = require('async')
  , chai = require('chai')
  , expect = chai.expect
  , gearman = require('gearman-coffee')
  , Docker = require('dockerode')
  , docker = new Docker({socketPath: '/var/run/docker.sock'})
  , net = require('net')
  , fs = require('fs');

chai.should();

suite.only('docker-example', function() {
  var gearmand_ip;
  setup(function(done) {
    this.timeout(5000);
    async.series([
      function(callback) {
        docker.createContainer({
          Image:'meetings/gearmand',
          Cmd:['gearmand', '--verbose', 'NOTICE', '-l', 'stderr']
          }, function(err, container) {
          if(err) console.log(err);
          container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
            stream.pipe(process.stdout);
          });
          container.start(function(err, data) {
            if(err) console.log(err);
            container.inspect(function(err, data) {
              gearmand_ip = data.NetworkSettings.IPAddress;
              connectUntilSuccess(gearmand_ip, 4730, callback);
            });
          });
        });
      },
      function(callback) {
        docker.createContainer({
          Image:'meetings/gearslothd',
          Cmd:['gearslothd', '-v', '-i', gearmand_ip],
          Tty:true
          }, function(err, container) {
          if(err) console.log(err);
          container.defaultOptions.start.Binds = ["/tmp:/var/lib/gearsloth:rw"];
          container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
            stream.pipe(process.stdout);
          });
          container.start(function(err, data) {
            if(err) console.log(err);
            callback();
          });
        });
      },
      function(callback) {
        docker.createContainer({
          Image:'meetings/gearslothd',
          Cmd:['gearslothd', '-v', '-r', gearmand_ip],
          Tty:true
          }, function(err, container) {
          if(err) console.log(err);
          container.defaultOptions.start.Binds = ["/tmp:/var/lib/gearsloth:rw"];
          container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
            stream.pipe(process.stdout);
          });
          container.start(function(err, data) {
            if(err) console.log(err);
            callback();
          });
        });
      },
      function(callback) {
        docker.createContainer({
          Image:'meetings/gearslothd',
          Cmd:['gearslothd', '-v', '-c', gearmand_ip],
          Tty:true
          }, function(err, container) {
          if(err) console.log(err);
          container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
            stream.pipe(process.stdout);
          });
          container.start(function(err, data) {
            if(err) console.log(err);
            callback();
          });
        });
      },
      function(callback) {
        docker.createContainer({
          Image:'meetings/gearslothd',
          Cmd:['gearslothd', '-v', '-e', gearmand_ip],
          Tty:true
          }, function(err, container) {
          if(err) console.log(err);
          container.defaultOptions.start.Binds = ["/tmp:/var/lib/gearsloth:rw"];
          container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
            stream.pipe(process.stdout);
          });
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
            docker.getContainer(containerInfo.Id).stop(callback);
          });
        callback();
        })
      }, function(callback) {
       fs.unlink('/tmp/gearsloth.sqlite', callback); 
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

function connectUntilSuccess(host, port, done) {
  console.log(host + port);
  var socket = net.connect({
    host: host,
    port: port
  }, function() {
    console.log('asdas');
    socket.end();
  })
  .on('error', function(err) {
    console.log('asdas');
    // catch error
  })
  .on('close', function(had_err) {
    if (had_err) {
      connectUntilSuccess(host, port, done);
    }
    else {
      console.log('asdas');
      done();
    }
  });
}
