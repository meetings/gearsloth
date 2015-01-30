var _       = require('underscore');
var async   = require('async');
var domain  = require('os').hostname();
var fmt     = require('util').format;
var fs      = require('fs');
var log     = require('../log');
var sqlite3 = require('sqlite3').verbose();

var sql = {
  create_table:
    'CREATE TABLE IF NOT EXISTS %s (' +
    ' id INTEGER PRIMARY KEY,' +
    ' at DATETIME,' +
    ' task BLOB,' +
    ' disabled BOOL )',

  save_task:
    "INSERT INTO %s (at, task, disabled) VALUES (datetime(?), ?, 0)",

  listen_task:
    "SELECT * FROM %s " +
    "WHERE (datetime(at) <= datetime('now')) AND disabled = 0",

  update_task:
    "UPDATE %s SET task = ?, at = datetime(?) " +
    "WHERE id = ? AND at = datetime(?) AND disabled = 0",

  disable_task:
    "UPDATE %s SET task = ?, disabled = 1 WHERE id = ?",

  delete_task:
    "DELETE FROM %s WHERE id = ?",

  _test_enabled_tasks:
    "SELECT * FROM %s WHERE disabled = 0"
};

module.exports.initialize = function(config, callback) {
  var adapter = new SQLiteAdapter(config);

  adapter.db = new sqlite3.Database(adapter.database, function(err) {
    if (err) {
      adapter.err('failed to create database instance', err);
      callback(err);
    }

    adapter.db.run(fmt(sql.create_table, adapter.table), function(err) {
      if (err) {
        adapter.err('failed to create table', err);
        callback(err);
      }
      callback(null, adapter);
    });
  });
}

function SQLiteAdapter(config) {
  if (typeof config.dbopt === 'undefined') {
    config.dbopt = {};
  }

  this.err = log.err.bind(null, 'sqlite:');
  this.info = log.info.bind(null, 'sqlite:');
  this.debug = log.debug.bind(null, 'sqlite:');

  this.domain = config.dbopt.domain || domain;
  this.table = config.dbopt.table_name || 'DelayedTasks';
  this.database = config.dbopt.database_file || 'gearsloth.sqlite';
  this.poll_interval = parseInt(config.dbopt.poll_interval, 10) || 999;

  this.debug('with config:\n', {
    domain: this.domain,
    table: this.table,
    database: this.database,
    poll_interval: this.poll_interval
  });
}

SQLiteAdapter.prototype.getDomains = function(callback) {
  return callback(null, [this.domain]);
};

SQLiteAdapter.prototype.saveTask = function(task, callback) {
  async.retry(12, _.bind(trySaveTask, this, task), callback);
};

var trySaveTask = function(task, callback) {
  var $ = this;
  var at = null;
  var query = fmt(sql.save_task, $.table);

  try {
    at = new Date(task.at).toISOString();
  }
  catch (e) {
    at = new Date().toISOString();
    task.at = at;
  }

  $.db.run(query, [at, JSON.stringify(task)], function(err) {
    if (err) {
      $.err('failed to save task');
      callback(err);
    }
    else {
      $.debug('task saved with id', this.lastID);
      callback();
    }
  });
};

SQLiteAdapter.prototype.listenTask = function(callback) {
  var $ = this;
  var loop = true;
  var listenQ = fmt(sql.listen_task, $.table);

  $.debug('polling expired tasks with delay:', $.poll_interval);

  (function listen() {
    $.db.all(listenQ, function(err, rows) {
      if (err) {
        $.err('listenTask', 'query failed', err);
        callback(err);
      }

      if (_.isEmpty(rows) && loop) {
        setTimeout(listen, $.poll_interval);
        return;
      }

      try {
        async.each(rows, _.bind(callbacker, $, callback), function() {
          if (loop) setTimeout(listen, 1);
        });
      }
      catch (e) {
        callback(e);
      }
    });
  })();

  return function() {
    $.debug('listen loop disabled');
    loop = false;
  };
};

var callbacker = function(runnerCallback, row, asyncCallback) {
  var task = null;

  try {
    task = JSON.parse(row.task);
    task.id = row.id;
  }
  catch (e) {
    throw 'failed to parse task';
  }

  runnerCallback(null, task, this.domain, task);
  asyncCallback(null);
};

SQLiteAdapter.prototype.updateTask = function(task, callback) {
  this.updateListenedTask(task, {}, callback);
};

SQLiteAdapter.prototype.updateListenedTask = function(task, state, callback) {
  var $ = this;
  var opts = [
    JSON.stringify(task),
    new Date(task.at).toISOString(),
    task.id,
    state.original_at || task.at
  ];

  var query = fmt(sql.update_task, this.table);

  this.db.run(query, opts, function(err) {
    if (err) {
      $.err('sqlite: task update error', task.id);
      callback(err);
    }
    else if (this.changes) {
      callback(null);
    }
    else {
      callback(true);
    }
  });
};

SQLiteAdapter.prototype.disableTask = function(task, callback) {
  this.disableListenedTask(task, {}, callback);
};

SQLiteAdapter.prototype.disableListenedTask = function(task, state, callback) {
  var $ = this;
  var opts = [JSON.stringify(task), task.id];
  var query = fmt(sql.disable_task, this.table);

  this.db.run(query, opts, function(err) {
    if (err) {
      $.err('failed to disable the task', task.id);
    }
    else {
      $.debug('disabled task id', task.id);
    }
    callback(null);
  });
};

SQLiteAdapter.prototype.completeTask = function(task, callback) {
  async.retry(12, _.bind(tryCompleteTask, this, task), callback);
};

var tryCompleteTask = function(task, callback) {
  var $ = this;
  var query = fmt(sql.delete_task, this.table);

  $.db.run(query, task.id, function(err) {
    if (err) {
      $.debug('failed to delete task');
      callback(err);
    }
    else {
      $.debug('deleted task with id', task.id);
      callback();
    }
  });
};

module.exports.testInterfaceReturnDbopt = function() {
  return {};
};

SQLiteAdapter.prototype.testInterfaceWipeDatastore = function(cb) {
  fs.unlink(this.database, cb);
};

SQLiteAdapter.prototype.testInterfaceGatherEnabledJobMetaList = function(cb) {
  var $ = this;
  var tasks = [];
  var query = fmt(sql._test_enabled_tasks, this.table);

  this.db.all(query, function(err, rows) {
    if (rows) {
      rows.forEach(function(row) {
        var job = JSON.parse(row.task);
        job.id = row.id;
        tasks.push({ domain: $.domain, job: job });
      });
    }
    cb(null, tasks);
  });
};
