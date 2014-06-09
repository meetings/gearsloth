var mysql = require('mysql')
  , async = require('async')
  , _ = require('underscore');

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
  this._connection = mysql.createConnection(config);
  this.connected = false;
  this._registerListeners(config);
}

MySQLMultimaster.prototype.connect = function(callback) {
  this._connection.connect(callback);
};

MySQLMultimaster.prototype._reconnect = function(reconnect_timeout) {
  reconnect_timeout = (reconnect_timeout && reconnect_timeout > 0) || 5000;
  var that = this;
  this.connect(function(err) {
    if(err)
      setTimeout(function() {
        _reconnect(reconnect_timeout);
      }, reconnect_timeout);
    else
      that.connected = true;
  });
};

MySQLMultimaster.prototype._registerListeners = function(config) {
  var that = this;
  this._connection.on('error', function(err) {
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
      that.connected = false;
      that._reconnect(config.reconnect_timeout * 1000);
    }
  });
};

MySQLMultimaster.prototype.saveTask = function(task, callback) {
  var sql = 'INSERT INTO gearsloth SET ?';
  var where = {
    at: getAtFromTask(task),
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
    return new Date(new Date().getTime() + task.after * 1000);
  }
  if(!task.at) {
    return new Date();
  }
  return task.at;
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
      listener(null, rowToTask(row));
    });
  });
};

function rowToTask (row) {
  var task = JSON.parse(row.task);
  task.id = {
    task_id: row.id
  };
  if(!task.at) {
    task.at = row.at;
  }
  return task;
}

MySQLMultimaster.prototype.updateTask = function(task, callback) {

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
