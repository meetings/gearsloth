var Docker = require('dockerode'),
    mysql  = require('mysql'),
    async  = require('async'),
    _      = require('underscore');

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
    var master_container = results.master[1];
    var slave_container = results.slave[1];

    var config = {
      master: results.master[0],
      slave: results.slave[0]
    }

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
      callback(err, config, master_container, slave_container);
    })
  });
};
