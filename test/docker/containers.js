var Docker = require('dockerode'),
    mysql  = require('mysql'),
    async  = require('async'),
    _      = require('underscore');

var docker = new Docker({socketPath: '/var/run/docker.sock'});

/* 
 * Spawns a mysql container. Takes one parameter, callback(remover).
 * When called, `remover` will stop and remove the created container.
 */
exports.mysql = function(callback) {
  var container_options = {
    Image: 'gearsloth/mysql',
    Cmd: 1,
    AttachStdout: false,
    AttachStderr: false,
  };


  docker.createContainer(container_options, function(err, container) {
    container.start(function(err, data) {
      async.waterfall([
        function(callback) {
          container.inspect(function(err, data) {
            var ip;
            if(data)
              ip = data.NetworkSettings.IPAddress;
            callback(err, ip);
          });
        },
        function(ip, callback) {
          var config = {
            host: ip,
            user: 'sloth'
          };

          function tryConnect (cb) {
            var conn = mysql.createConnection(config);
            conn.connect(function(err) {
              conn.destroy();
              cb(err, config);
            });
          }

          // try to connect 10 times every 500 ms
          async.retry(10, async.apply(setTimeout, tryConnect, 500), callback);
        }
      ], function(err, config) {
        var stopAndRemoveContainer = function () {
          async.series([
            _.bind(container.stop, container),
            _.bind(container.remove, container)
          ], function(err) {
            if(err)
              console.error('Error stopping container: ' + err);
          });
        };

        if(err)
          return console.error('Error starting container: ' + err);

        callback(stopAndRemoveContainer);
      });
    });
  });
};