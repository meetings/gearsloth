var child_process = require('child_process');
var net = require('net');
var async = require('async');

var gearmand = exports.gearmand = function(port, done) {
  var gearmand = child_process.spawn('gearmand',
    ['-l', '/dev/null', '-p', port.toString()]);
  connectUntilSuccess(port, done);
  return gearmand;
}

var gearslothd = exports.gearslothd = function(conf, done) {
  var conf_arg = '--conf=' + JSON.stringify(conf);
  var gearslothd = child_process.spawn('./bin/gearslothd', [ conf_arg ]);
  //gearslothd.stdout.pipe(process.stdout);
  readUntilMatch(gearslothd.stdout, /gearslothd: fully connected/, done);
  return gearslothd;
}

var killall = exports.killall = function(processes, done) {
  async.parallel(
    processes.map(function(process) {
      return function(callback) {
        process.on('exit', function() {
          // ignore exit code & signal
          callback();
        });
      };
    }),
    function(err) {
      done(err ? 'error killing processes' : null);
    }
  );
  processes.forEach(function(process) {
    process.kill();
  });
}

// private

function connectUntilSuccess(port, done) {
  var socket = net.connect({
    host: 'localhost',
    port: port
  }, function() {
    socket.end();
  })
  .on('error', function(err) {
    // catch error
  })
  .on('close', function(had_err) {
    if (had_err)
      connectUntilSuccess(port, done);
    else
      done();
  });
}

function readUntilMatch(stream, regex, done) {
  // stream is assumed to be line buffered
  stream.setEncoding('utf8');
  stream.on('data', function(line) {
    if (line.match(regex))
      done();
  });
  stream.on('end', function() {
    // ignore
  });
}
