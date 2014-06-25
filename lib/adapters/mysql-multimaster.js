var mysql = require('mysql')
  , async = require('async')
  , _ = require('underscore')
  , crypto = require('crypto');

module.exports.initialize = initialize;
module.exports.MySQLMultimaster = MySQLMultimaster;

function initialize (config, callback) {
  var adapter = new MySQLMultimaster(config.dbopt);

  async.series([
    _.bind(adapter.connect, adapter),
    _.partial(initializeTables, adapter)
  ], function(err) {
    if(err)
      return callback(err);
    callback(null, adapter);
  });
}

function initializeTables (adapter, callback) {
  var create_gearsloth = "CREATE TABLE IF NOT EXISTS gearsloth (" +
    " id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
    " at         DATETIME," +
    " task       TEXT," +
    " state      ENUM('added', 'enabled') NOT NULL DEFAULT 'added'," +
    " INDEX      at (at)" +
    ") ENGINE = InnoDB;";

  var create_gearsloth_disabled = "CREATE TABLE IF NOT EXISTS gearsloth_disabled (" +
    " id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
    " at         DATETIME," +
    " task       TEXT," +
    " INDEX      at (at)" +
    ") ENGINE = InnoDB;";

  adapter._pool.getConnection('MASTER', function(err, master) {
    adapter._pool.getConnection('SLAVE', function(err, slave) {
      if(err)
        return callback(err);

      async.series([
        _.bind(master.query, master, create_gearsloth),
        _.bind(master.query, master, create_gearsloth_disabled),
        async.retry(5, _.partial(setTimeout, slaveUpdated, 100))
      ], function(err) {
        master.release();
        slave.release();
        callback(err);
      });

      function slaveUpdated (callback) {
        setTimeout(callback, 1000); // HAAAAAAAX will fix later okthx :-)
      }
    });
  });
}

function MySQLMultimaster (config) {
  if(!config.master) {
    config = {
      master: config,
      slave: config
    };
  }
  config.slave.timezone = 'Z';
  config.master.timezone = 'Z'; // save everything in UTC to MySQL

  if(!config.master.database)
    config.master.database = 'gearsloth';
  if(!config.slave.database)
    config.slave.database = 'gearsloth';

  this._pool = mysql.createPoolCluster();
  this._pool.add('MASTER', config.master);
  this._pool.add('SLAVE', config.slave);
  this._config = config;
}

MySQLMultimaster.prototype.connect = function(callback) {
  async.parallel([
    this._pool.getConnection.bind(this._pool, 'MASTER'),
    this._pool.getConnection.bind(this._pool, 'SLAVE')
  ], function(err, results) {
    results.forEach(function(connection) {
      if(connection)
        connection.release();
    });
    callback(err);
  });
};

MySQLMultimaster.prototype.saveTask = function(task, callback) {
  var pool = this._pool;
  var master;
  var slave;

  async.auto({
    connectMaster: connectMaster,
    connectSlave: connectSlave,
    saveToMaster: ['connectMaster', 'connectSlave', saveToMaster],
    savedToSlave: ['saveToMaster', savedToSlave]
  }, function(err, results) {
    if(master)
      master.release();
    if(slave)
      slave.release();

    if(!results.saveToMaster)
      return callback(err);

    if(results.savedToSlave) {
      enableTask(results.saveToMaster, function(err) {
        callback(err, results.saveToMaster);
      });
    } else {
      removeTaskFromMaster(results.saveToMaster, function() {
        callback(err);
      });
    }
  });

  function connectMaster (callback) {
    pool.getConnection('MASTER', function(err, connection) {
      master = connection;
      callback(err, connection);
    });
  }

  function connectSlave (callback) {
    pool.getConnection('SLAVE', function(err, connection) {
      slave = connection;
      callback(err, connection);
    });
  }

  function saveToMaster (callback) {
    var sql = 'INSERT INTO gearsloth SET at = ' + getAtFromTask(task) + ', ?';
    var set = {
      task: JSON.stringify(task)
    };

    master.query(sql, set, function(err, result) {
      var inserted_id;
      if(result && result.insertId)
        inserted_id = result.insertId

      callback(err, inserted_id);
    });
  }

  function savedToSlave (callback, results) {
    var sql = 'SELECT COUNT(*) as rows FROM gearsloth WHERE ?';
    var inserted_id = results.saveToMaster;
    var where = {
      id: inserted_id
    };

    async.retry(10, selectFromSlave, callback);

    function selectFromSlave (cb) {
      slave.query(sql, where, function(err, result) {
        if(err)
          return cb(err);

        var isSaved = result[0].rows == 1;
        if(isSaved) {
          cb(null, isSaved);
        } else {
          setTimeout(cb, 100, new Error('Slave not updated, id: ' + inserted_id));
        }
      });
    }
  }

  function enableTask (inserted_id, callback) {
    var update_sql = "UPDATE gearsloth SET state = 'enabled' WHERE ?"
    var where = {
      id: inserted_id
    };

    master.query(update_sql, where, callback);
  }

  function removeTaskFromMaster (inserted_id, callback) {
    var delete_sql = 'DELETE FROM gearsloth WHERE ?';
    var where = {
      id: inserted_id
    };

    master.query(delete_sql, where, callback);
  }

};

function getAtFromTask (task) {
  if(task.after) {
    return mysql.format('TIMESTAMPADD(SECOND, ?, UTC_TIMESTAMP())', 
      parseInt(task.after));
  }
  if(task.at) {
    return mysql.escape(task.at);
  }
  return 'UTC_TIMESTAMP()';
}

MySQLMultimaster.prototype.listenTask = function(callback) {
  var this_ = this;
  this._listener = callback;
  var poll_interval = setInterval(this._poll.bind(this), 1000);
  return function(removerCallback) {
    this_._listener = null;
    clearInterval(poll_interval);
    if(removerCallback) 
      removerCallback();
  };
};

MySQLMultimaster.prototype._poll = function() {
  var listener = this._listener;
  var time_set = 'SET @t = UTC_TIMESTAMP();'
  var sql_select = 'SELECT * FROM gearsloth WHERE at <= @t FOR UPDATE;';
  var sql_update = 'UPDATE gearsloth SET at=TIMESTAMPADD(SECOND,1000,at) WHERE at <= @t;'

  this._pool.getConnection('MASTER', function(err, connection) {
    if(err)
      return;

    async.series([
      connection.beginTransaction.bind(connection),
      connection.query.bind(connection, time_set),
      connection.query.bind(connection, sql_select),
      connection.query.bind(connection, sql_update),
      connection.commit.bind(connection)
    ], function(err, results) {
      if(err) {
        connection.rollback(function() {
          connection.release();
        });
      } else {
        connection.release();
        var select_results = results[2][0];
        select_results.forEach(function(row) {
          listener(null, rowToTask(row));
        });
      }
    });
  });
};

function rowToTask (row) {
  var task = JSON.parse(row.task);
  task.id = row.id;
  if(!task.at) {
    task.at = row.at;
  }
  return task;
}

MySQLMultimaster.prototype.updateTask = function(task, callback) {
  this._pool.getConnection('MASTER', function(err, connection) {
    var sql = 'UPDATE gearsloth SET at = ' + getAtFromTask(task) +  ', ? WHERE ?';
    var task_id = task.id;
    delete task.id;
    var values = {
      task: JSON.stringify(task)
    }
    var where = {
      id: task_id
    }

    connection.query(sql, [values, where], function(err, result) {
      connection.release();
      if(err)
        return callback(err);
    
      callback(null, result.affectedRows);
    });
  });
};

MySQLMultimaster.prototype.completeTask = function(task, callback) {
  this._pool.getConnection('MASTER', function(err, connection) {
    var sql = 'DELETE FROM gearsloth WHERE ?;';
    var where = {
      id: task.id
    };
  
    connection.query(sql, where, function(err, result) {
      connection.release();
      if(err)
        callback(err);
      else
        callback(null, result.affectedRows);
    });
  });
};

MySQLMultimaster.prototype.disableTask = function(task, callback) {
  var id = task.id;
  var sql_insert = 'INSERT INTO gearsloth_disabled SELECT id, at, task FROM gearsloth WHERE id = ?';
  var sql_delete = 'DELETE FROM gearsloth WHERE id = ?';

  this._pool.getConnection('MASTER', function(err, connection) {
    if(err)
      return callback(err);

    async.series([
      connection.beginTransaction.bind(connection),
      connection.query.bind(connection, sql_insert, id),
      connection.query.bind(connection, sql_delete, id),
      connection.commit.bind(connection)
    ], function(err, results) {
      if(err) {
        connection.rollback(connection.release.bind(connection));
        callback(err);
      } else {
        var result = results[2][0];
        callback(null, result.affectedRows);
      }
    });
  });
};
