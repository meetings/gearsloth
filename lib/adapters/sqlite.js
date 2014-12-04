var _       = require('underscore');
var async   = require('async');
var domain  = require('os').hostname();
var fmt     = require('util').format;
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
    "DELETE FROM %s WHERE id = ?"
};

module.exports.initialize = function(config, callback) {
  var adapter = new SQLiteAdapter(config);
}

function SQLiteAdapter(config) {
  if (typeof config.dbopt === 'undefined') {
    config.dbopt = {};
  }

  this.err = log.err.bind(null, 'sqlite');
  this.debug = log.debug.bind(null, 'sqlite');

  this.domain = config.dbopt.domain || domain;
  this.table = config.dbopt.table_name || 'DelayedTasks';
  this.poll_timeout = parseInt(config.dbopt.poll_timeout, 10) || 1000;
  this.default_timeout = parseInt(config.dbopt.default_timeout, 10) || 1000;

  this.db = new sqlite3.Database('DelayedTasks.sqlite', create_table.bind(this));
}

var create_table = function(err) {
  if (err) {
    this.err('failed to create database instance');
    this.err(err);
  }

  var $ = this;
  var query = fmt(sql.create_table, $.table);

  $.db.run(query, function(err) {
    if (err) {
      $.err('failed to create table');
      $.err(err);
    }
    $.debug('created', $.table);
  });
};

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
      callback(error);
    }
    $.debug('saved task to database');
    callback();
  });
};

SQLiteAdapter.prototype.listenTask = function(callback) {
  var $ = this;
  var loop = true;
  var listenQ = fmt(sql.listen_task, $.table);
  var updateQ = fmt(sql.update_fetched_row, $.table, $.default_timeout);

  (function listen() {
    $.db.all(listenQ, $.table, function(err, rows) {
      if (err) {
        $.err('listenTask', 'query failed');
        $.err(err);
        callback(err);
      }

      rows.forEach(function(row) {
        $.debug('found task FIXME');
        var opts = [$.table, row.id];
        $.db.run(updateQ, opts, _.partial(update_handler, $, row, callback));
      });

      if (loop) {
        setTimeout(listen, $.poll_timeout);
      }
    });
  })();

  return function() { loop = false; };
};

SQLiteAdapter.prototype.updateListenedTask = updateTask;

var updateTask = function(task, state, callback) {
  var opts = [JSON.stringify(task), task.id];
  var expire = task_expiration(task);

  var query = (expire.at)?
    fmt(sql.update_task_at, this.table, expire.at):
    fmt(sql.update_task_after, this.table, expire.after);

  this.db.run(query, opts, _.partial(
    generic_handler, this, task.id, 'update', callback
  ));
};

SQLiteAdapter.prototype.disableListenedTask = disableTask;

var disableTask = function(task, state, callback) {
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
  if (task.at && task.at.toISOString) {
    return { at: task.at.toISOString() };
  }
  return { at: new Date().toISOString() };
};

var update_handler = function(err, $, row, callback) {
  var task = null;

  if (err) {
    $.err('failed to update task');
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
    task.at = new Date(row.at);
    callback(null, task);
  }
};

var generic_handler = function(err, $, id, verb, callback) {
  if (err) {
    $.err(fmt('failed to %s the task', verb), id);
    callback(err);
  }

  $.debug(fmt('task %sd', verb), id);
  callback(null, this.changes);
};

/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/*
function testInterfaceWipeDatastore(callback) {
  async.parallel([
    function(next) {
      fs.exists(db_id, function(exists) {
        if (exists) {
          fs.unlink(db_id, function() {
              next();
          });
        } else {
          next();
        }
      });
    },
    function(next) {
      fs.exists(db_id + '-journal', function(exists) {
        if (exists) {
          fs.unlink(db_id + '-journal', function() {
              next();
          });
        } else {
          next();
        }
      });
    }
    ], callback);
}

function testInterfaceGatherEnabledJobMetaList(callback) {
  var job_meta_list = [];
  var selection_all = 'SELECT * FROM ' + table_name;
  database.all(selection_all, function(error, rows) {
    rows.forEach(function(row) {
      var job = {
        domain: domain,
        job: JSON.parse(row.task)
      };
      job_meta_list.push(job);
    });
    callback(null, job_meta_list);
  });
}

function testInterfaceReturnDbopt() {
  return {
    'db_name' : '/tmp/gearloth_test_db.sqlite',
    'poll_timeout' : 100
  };
}
*/
