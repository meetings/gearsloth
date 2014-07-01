var Docker = require('dockerode'),
    mysql  = require('mysql'),
    async  = require('async'),
    _      = require('underscore'),
    net    = require('net');

var docker = new Docker({socketPath: '/var/run/docker.sock'});

/* 
 * Spawns a mysql container. mysql([server_id], callback(err, config, remover)).
 * When called, `remover` will stop and remove the created container. Config 
 * will contain the configuration object for the MySQL connection.
 */
exports.mysql = function(server_id, callback) {
  if(!callback && typeof(server_id) === 'function') {
    callback = server_id;
    server_id = 1;
  }

  var container_options = {
    Image: 'meetings/mysql',
    Cmd: server_id,
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
            conn.query('SET GLOBAL server_id = ?', server_id, function(err) {
              conn.destroy();
              cb(err, config);
            });
          }

          // try to connect 10 times every 500 ms
          async.retry(10, async.apply(setTimeout, tryConnect, 500), callback);
        }
      ], function(err, config) {
        callback(err, config, container);
      });
    });
  });
};

exports.multimaster_mysql = function(callback) {
  async.parallel({
    master: async.apply(exports.mysql, 1),
    slave: async.apply(exports.mysql, 2)
  }, function(err, results) {
    if(err)
      return callback(err);
    var master_container = results.master[1];
    var slave_container = results.slave[1];

    var config = {
      master: results.master[0],
      slave: results.slave[0]
    }

    config.master.database = 'gearsloth';
    config.slave.database = 'gearsloth';

    var conn_m = mysql.createConnection(config.master);
    var conn_s = mysql.createConnection(config.slave);

    async.parallel([
      function(callback) {
        conn_m.query('SHOW MASTER STATUS', function(err, result) {
          async.series([
            _.bind(conn_s.query, conn_s, 'CHANGE MASTER TO MASTER_HOST=?, ' +
              'MASTER_LOG_FILE=?, ' +
              'MASTER_LOG_POS=?, ' +
              'MASTER_PORT=3306, ' +
              "MASTER_USER='replication', MASTER_PASSWORD='replication'", 
              [config.master.host, result[0].File, result[0].Position]),
            _.bind(conn_s.query, conn_s, 'SLAVE START')
          ], callback);
        });
      },
      function(callback) {
        conn_s.query('SHOW MASTER STATUS', function(err, result) {
          async.series([
            _.bind(conn_m.query, conn_m, 'CHANGE MASTER TO MASTER_HOST=?, ' +
              'MASTER_LOG_FILE=?, ' +
              'MASTER_LOG_POS=?, ' +
              'MASTER_PORT=3306, ' +
              "MASTER_USER='replication', MASTER_PASSWORD='replication'", 
              [config.slave.host, result[0].File, result[0].Position]),
            _.bind(conn_m.query, conn_m, 'SLAVE START')
          ], callback);
        });
      }
    ], function(err) {
      conn_m.destroy();
      conn_s.destroy();

      callback(err, config, master_container, slave_container);
    })
  });
};

/**
 * Start a gearmand docker container, and returns it in a callback param.
 *
 * @param {Array} cmd - An array with the bin to run and its arguments
 * @param {boolean} verbose - Whether to attach a stdout to container
 * @param {Function} callback - Called when gearmand is reachable with a conf {host:host,port:port} as a parameter
 */

exports.gearmand = function(cmd, talkative, callback, host_port) {
  docker.createContainer({
    Image:'meetings/gearmand',
    Cmd:cmd,
    ExposedPorts:{"4730/tcp":{}}
  }, function(err, container) {
    if(err) console.log(err);

    if(talkative) {
      container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
        stream.pipe(process.stdout);
      });
    }

    if(host_port) {
      container.defaultOptions.start.PortBindings = {
        "4730/tcp": [{"HostPort": host_port}]
      };
    }

    container.start(function(err, data) {
      if(err) console.log(err);

      container.inspect(function(err, data) {
        var config = [{
          host: (data.HostConfig.PortBindings) ? data.NetworkSettings.Gateway : data.NetworkSettings.IPAddress,
          port: (data.HostConfig.PortBindings) ? host_port : "4730"
        }];
        connectUntilSuccess(config[0].host, config[0].port, function() {
          callback(config, container); 
        });
      });
    });
  });
  
  function connectUntilSuccess(host, port, done) {
    var socket = net.connect({
      host: host,
      port: port
    }, function() {
      socket.end();
    })
    .on('error', function(err) {
      // catch error
    })
    .on('close', function(had_err) {
      if (had_err) {
        setTimeout(function () {
          connectUntilSuccess(host, port, done);
        }, 100);
      }
      else {
        done();
      }
    });
  }
};

/**
 * Start a gearslothd docker container, and returns it in a callback param.
 *
 * @param {Array} cmd - An array with the bin to run and its arguments
 * @param {boolean} talkative - Whether to attach a stdout to container
 * @param {Function} callback - Called when the container is up and running
 */

exports.gearslothd = function(config, talkative, callback) {
  docker.createContainer({
    Image:'meetings/gearslothd',
    Cmd:['gearslothd', '--conf='+JSON.stringify(config)]
    }, function(err, container) {
    if(err) console.log(err);

    if(talkative) {
      container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
        stream.pipe(process.stdout);
      });
    }

    container.start(function(err, data) {
      if(err) console.log(err);
      callback(container);
    });
  });

};

/**
 * Stops and removes all containers in docker.
 *
 * @param {Function} done - Called with error if one occurs, or with no params when completed
 */
exports.stopAndRemoveAll = function(done) {
  async.waterfall([
    function(callback) {
      docker.listContainers(function (err, containers) {
        if(err) done(err);
        async.each(containers, function(container_info, callback) {
           docker.getContainer(container_info.Id).stop(function(err, data) {
             if(err) done(err);
             callback();
          });
        }, function(err) {
          callback(null, containers);
        });
      });
    },
    function(containers, callback) {
      async.each(containers, function(container_info, callback) {
        docker.getContainer(container_info.Id).remove(function(err, data) {
          if(err) done(err);
          callback();
        });
      }, function(err) {
        if (err) done(err);
        callback();
      });
    }],
    function() {
      done();
    });
};
