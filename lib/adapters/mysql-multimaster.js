var mysql = require('mysql')
  , async = require('async')
  , _ = require('underscore')
  , crypto = require('crypto');

module.exports.initialize = initialize;
module.exports.MySQLMultimaster = MySQLMultimaster;

function initialize (config, callback) {
  var adapter = new MySQLMultimaster(config);
  adapter.connect(function(err) {
    if(err)
      callback(err);
    else {
      adapter.connected = true;
      callback(null, adapter);
    }
  });
}

function MySQLMultimaster (config) {
  config.timezone = 'Z'; // save everything in UTC to MySQL
  this.db_id = generateDbId(config);
  this._pool = mysql.createPool(config);
  this._config = config;
}

function generateDbId(config) {
  var user = config.user || 'undefined';
  var hash = crypto.createHash('md5');
  var user_hash = hash.update(user).digest('hex').substring(0,10);
  return 'mysql-multimaster://'
    + user_hash + '@'
    + config.host + ':'
    + config.port;
}

MySQLMultimaster.prototype.connect = function(callback) {
  this._pool.getConnection(function(err, connection) {
    if(connection)
      connection.release();
    callback(err);
  });
};

MySQLMultimaster.prototype.saveTask = function(task, callback) {
  var sql = 'INSERT INTO gearsloth SET at = ' + getAtFromTask(task) + ', ?';
  var set = {
    task: JSON.stringify(task)
  };

  this._pool.query(sql, set, function(err, result) {
    if(err)
      return callback(err);

    callback(null, result.insertId);
  });
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
  var db_id = this.db_id;

  this._pool.getConnection(function(err, connection) {
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
        connection.rollback(connection.release.bind(connection));
      } else {
        connection.release();
        var select_results = results[2][0];
        select_results.forEach(function(row) {
          listener(null, rowToTask(row, db_id));
        });
      }
    });
  });
};

function rowToTask (row, db_id) {
  var task = JSON.parse(row.task);
  task.id = {
    db_id: db_id,
    task_id: row.id
  };
  if(!task.at) {
    task.at = row.at;
  }
  return task;
}

MySQLMultimaster.prototype.updateTask = function(task, callback) {
  var sql = 'UPDATE gearsloth SET ? WHERE ?';
  var task_id = task.id.task_id;
  delete task.id;
  var values = {
    at: task.at,
    task: JSON.stringify(task)
  }
  var where = {
    id: task_id
  }

  this._pool.query(sql, [values, where], function(err, result) {
    if(err)
      callback(err);
    else
      callback(null, result.affectedRows);
  });
};

MySQLMultimaster.prototype.completeTask = function(task, callback) {
  var sql = 'DELETE FROM gearsloth WHERE ?;';
  var where = {
    id: task.id.task_id
  };

  this._pool.query(sql, where, function(err, result) {
    if(err)
      callback(err);
    else
      callback(null, result.affectedRows);
  });
};

MySQLMultimaster.prototype.disableTask = function(task, callback) {
  var id = task.id.task_id;
  var sql_insert = 'INSERT INTO gearsloth_disabled SELECT * FROM gearsloth WHERE id = ?';
  var sql_delete = 'DELETE FROM gearsloth WHERE id = ?';

  this._pool.getConnection(function(err, connection) {
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
