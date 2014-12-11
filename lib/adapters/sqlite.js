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

  save_task_at:
    "INSERT INTO %s (at, task, disabled) " +
    "VALUES (datetime('%s'), ?, 0)",
  save_task_after:
    "INSERT INTO %s (at, task, disabled) " +
    "VALUES (datetime('now', '%s seconds'), ?, 0)",

  listen_task:
    "SELECT * FROM %s " +
    "WHERE (datetime(at) <= datetime('now')) AND disabled = 0",
  update_fetched_row:
    "UPDATE %s SET at = datetime('now', '%s seconds') WHERE id = ?",

  update_task_at:
    "UPDATE %s SET task = ?, at = datetime('%s') WHERE id = ?",
  update_task_after:
    "UPDATE %s SET task = ?, at = datetime('now', '%s seconds') WHERE id = ?",

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
      this.err('failed to create database instance', err);
      callback(err);
    }

    adapter.db.run(fmt(sql.create_table, adapter.table), function(err) {
      if (err) {
        $.err('failed to create table', err);
        callback(err);
      }
      callback(null, adapter);
    });
  });
}

function SQLiteAdapter(config, callback) {
  if (typeof config.dbopt === 'undefined') {
    config.dbopt = {};
  }

  this.err = log.err.bind(null, 'sqlite');
  this.debug = log.debug.bind(null, 'sqlite');

  this.domain = config.dbopt.domain || domain;
  this.table = config.dbopt.table_name || 'DelayedTasks';
  this.database = config.dbopt.db_file || 'DelayedTasks.sqlite';
  this.poll_interval = parseInt(config.dbopt.poll_interval, 10) || 333;
  this.default_timeout = parseInt(config.dbopt.default_timeout, 10) || 1000;
}

SQLiteAdapter.prototype.getDomains = function(callback) {
  return callback(null, [this.domain]);
};

SQLiteAdapter.prototype.saveTask = function(task, callback) {
  var $ = this;
  var expire = task_expiration(task);

  var query = (expire.at)?
    fmt(sql.save_task_at, $.table, expire.at):
    fmt(sql.save_task_after, $.table, expire.after);

  $.db.run(query, JSON.stringify(task), function(err) {
    if (err) {
      $.err('failed to save task');
      callback(err);
    }
    $.debug('task saved with id', this.lastID);
    callback();
  });
};

SQLiteAdapter.prototype.listenTask = function(cb) {
  var $ = this;
  var loop = true;
  var listenQ = fmt(sql.listen_task, $.table);
  var updateQ = fmt(sql.update_fetched_row, $.table, $.default_timeout);

  (function listen() {
    $.db.all(listenQ, function(err, rows) {
      if (err) {
        $.err('listenTask', 'query failed', err);
        cb(err);
      }

      if (rows) {
        rows.forEach(function(row) {
          $.db.run(updateQ, row.id, _.partial(update_handler, $, row, cb));
        });
      }

      if (loop) {
        setTimeout(listen, $.poll_interval);
      }
    });
  })();

  return function() {
    $.debug('listen loop disabled');
    loop = false;
  };
};

SQLiteAdapter.prototype.updateTask = function(task, callback) {
  this.updateListenedTask(task, null, callback);
};

SQLiteAdapter.prototype.updateListenedTask = function(task, state, callback) {
  var opts = [JSON.stringify(task), task.id];
  var expire = task_expiration(task);

  var query = (expire.at)?
    fmt(sql.update_task_at, this.table, expire.at):
    fmt(sql.update_task_after, this.table, expire.after);

  this.db.run(query, opts, _.partial(
    generic_handler, this, task.id, 'update', callback
  ));
};

SQLiteAdapter.prototype.disableTask = function(task, callback) {
  this.disableListenedTask(task, null, callback);
};

SQLiteAdapter.prototype.disableListenedTask = function(task, state, callback) {
  var opts = [JSON.stringify(task), task.id];
  var query = fmt(sql.disable_task, this.table);

  this.db.run(query, opts, _.partial(
    generic_handler, this, task.id, 'disable', callback
  ));
};

SQLiteAdapter.prototype.completeTask = function(task, callback) {
  var query = fmt(sql.delete_task, this.table);

  this.db.run(query, task.id, _.partial(
    generic_handler, this, task.id, 'delete', callback
  ));
};

var task_expiration = function(task) {
  var after = parseInt(task.after, 10);
  if (!isNaN(after)) {
    return { after: after };
  }
  if (!isNaN(Date.parse(task.at))) {
    return { at: new Date(task.at).toISOString() };
  }
  return { at: new Date().toISOString() };
};

var update_handler = function($, row, callback, err) {
  var task = null;

  if (err) {
    $.err('failed to update task', err);
    callback(err);
  }

  if (this.changes) {
    try {
      task = JSON.parse(row.task);
    }
    catch (e) {
      $.err('failed to parse task');
      callback(e);
    }
    task.id = row.id;
    task.at = new Date(row.at).toISOString();
    $.debug('task updated with id', row.id);
    callback(null, task, $.domain, null);
  }
};

var generic_handler = function($, id, verb, callback, err) {
  if (err) {
    $.err(fmt('failed to %s the task', verb), id);
    callback(err);
  }

  $.debug(fmt('task with %s %sd', id, verb));
  callback(null, this.changes);
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
