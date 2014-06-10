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
  this.connected = false;
  this.db_id = generateDbId(config);
  this._connection = mysql.createConnection(config);
  this._config = config;

  this._registerListeners();
}

function generateDbId(config) {
  var user = config.user || 'undefined';
  var hash = crypto.createHash('md5');
  var user_hash = hash.update(user).digest('hex');
  return 'mysql-multimaster://'
    + user_hash + '@'
    + config.host + ':'
    + config.port;
}

MySQLMultimaster.prototype._registerListeners = function() {
  var that = this;
  this._connection.on('error', function(err) {
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
      that.connected = false;
      that._reconnect(that._config.reconnect_timeout * 1000);
    }
  });
};

MySQLMultimaster.prototype.connect = function(callback) {
  this._connection.connect(callback);
};

MySQLMultimaster.prototype._reconnect = function(reconnect_timeout) {
  reconnect_timeout = (reconnect_timeout && reconnect_timeout > 0) || 5000;
  var that = this;
  this._connection = mysql.createConnection(this._config);
  this._connection.connect(function(err) {
    if(err)
      setTimeout(function() {
        _reconnect(reconnect_timeout);
      }, reconnect_timeout);
    else
      that.connected = true;
  });
};

MySQLMultimaster.prototype.saveTask = function(task, callback) {
  var sql = 'INSERT INTO gearsloth SET at = ' + getAtFromTask(task) + ', ?';
  var where = {
    task: JSON.stringify(task)
  };

  this._connection.query(sql, where, function(err, result) {
    if(err)
      callback(err);
    else
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
  var conn = this._connection;
  var that = this;

  async.series([
    _.bind(conn.beginTransaction, conn),
    _.bind(conn.query, conn, time_set),
    _.bind(conn.query, conn, sql_select),
    _.bind(conn.query, conn, sql_update),
    _.bind(conn.commit, conn)
  ], function(err, results) {
    if(err)
      return conn.rollback();

    var select_results = results[2][0];
    select_results.forEach(function(row) {
      listener(null, rowToTask(row, that.db_id));
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

  this._connection.query(sql, [values, where], function(err, result) {
    if(err)
      callback(err);
    else
      callback(null, result.affectedRows);
  })
};

MySQLMultimaster.prototype.completeTask = function(task, callback) {
  var sql = 'DELETE FROM gearsloth WHERE ?;';
  var where = {
    id: task.id.task_id
  };

  this._connection.query(sql, where, function(err, result) {
    if(err)
      callback(err);
    else
      callback(null, result.affectedRows);
  });
};
