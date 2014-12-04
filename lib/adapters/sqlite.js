var _       = require('underscore');
var log     = require('../log');
var fs      = require('fs');
var async   = require('async');
var fmt     = require('util').format;
var domain  = require('os').hostname();
var sqlite3 = require('sqlite3').verbose();

var sql = {
  create_table:
    'CREATE TABLE IF NOT EXISTS %s (' +
    'id       INTEGER PRIMARY KEY,' +
    'at       DATETIME,' +
    'task     BLOB,' +
    'disabled BOOL' +
    ')',

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
    "UPDATE %s SET task = ?, disabled = 1 WHERE id = ?"
};

function initialize(config, callback) {
  var adapter = new SQLiteAdapter(config);
}

function SQLiteAdapter(config) {
  if (typeof config.dbopt === 'undefined') {
    config.dbopt = {};
  }

  this.domain = config.dbopt.domain || domain;
  this.table = config.dbopt.table_name || 'DelayedTasks';
  this.poll_timeout = parseInt(config.dbopt.poll_timeout, 10) || 1000;
  this.default_timeout = parseInt(config.dbopt.default_timeout, 10) || 1000;

  this.db = new sqlite3.Database('DelayedTasks.sqlite', create_table.bind(this));
}

var create_table = function(err) {
  if (err) {
    log.err('failed to create database instance');
    log.err(err);
  }

  var query = fmt(sql.create_table, this.table);

  this.db.run(query, function(err) {
    if (err) {
      log.err('failed to create table');
      log.err(err);
    }
    log.debug('table created');
  });
};

SQLiteAdapter.prototype.getDomains = function(callback) {
  return callback(null, [this.domain]);
};

SQLiteAdapter.prototype.task_expiration = function(task) {
  var after = parseInt(task.after, 10);
  if (!isNaN(after)) {
    return { after: after };
  }
  if (task.at && task.at.toISOString) {
    return { at: task.at.toISOString() };
  }
  return { at: new Date().toISOString() };
};

SQLiteAdapter.prototype.saveTask = function(task, callback) {
  var expire = task_expiration(task);

  var query = (expire.at)?
    fmt(sql.save_task_at, this.table, expire.at):
    fmt(sql.save_task_after, this.table, expire.after);

  this.db.run(query, JSON.stringify(task), function(err) {
    if (err) {
      log.err('failed to save task');
      callback(error);
    }
    log.debug('saved task to database');
    callback();
  });
};

SQLiteAdapter.prototype.listenTask = function(callback) {
  var $ = this;
  var listenQ = fmt(sql.listen_task, $.table);
  var updateQ = fmt(sql.update_fetched_row, $.table, $.default_timeout);

  (function listen() {
    $.db.all(listenQ, $.table, function(err, rows) {
      if (err) {
        log.err('failed to query database');
        callback(err);
      }
      rows.forEach(function(row) {
        log.debug('found task FIXME');
        var opts = [$.table, row.id];
        $.db.run(updateQ, opts, _.partial(update_handler, row, callback));
      });
      setTimeout(listen, $.poll_timeout);
    });
  })();
};

var update_handler = function(err, row, callback) {
  var task = null;

  if (err) {
    log.err('failed to update task');
    callback(err);
  }

  if (this.changes) {
    try {
      task = JSON.parse(row.task);
    }
    catch (e) {
      log.err('failed to parse JSON task from database');
      callback(e);
    }
    task.id = row.id;
    task.at = new Date(row.at);
    callback(null, task);
  }
};

SQLiteAdapter.prototype.updateListenedTask = updateTask;

var updateTask = function(task, state, callback) {
  var opts = [JSON.stringify(task), task.id];
  var expire = task_expiration(task);

  var query = (expire.at)?
    fmt(sql.update_task_at, this.table, expire.at):
    fmt(sql.update_task_after, this.table, expire.after);

  this.db.run(query, opts, _.partial(
    generic_run_handler, task.id, 'update', callback
  ));
};

SQLiteAdapter.prototype.disableListenedTask = disableTask;

var disableTask = function(task, state, callback) {
  var opts = [JSON.stringify(task), task.id];
  var query = fmt(sql.disable_task, this.table);

  this.db.run(query, opts, _.partial(
    generic_run_handler, task.id, 'disable', callback
  ));
};

var generic_run_handler = function(err, id, verb, callback) {
  if (err) {
    log.err(fmt('failed to %s the task', verb), id);
    callback(err);
  }
  log.debug(fmt('task %sd', verb), id);
  callback(null, this.changes);
};

SQLiteAdapter.prototype.completeTask = function(task, callback) {
};


/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/**
 * Initialize the database with a configuration specific to the adapter.
 * The initialization takes in a callback function which is called after the
 * connection is established. If at any point in initialization there were
 * errors the callback is called with an error object. The callback funtion
 * is otherwise called with a falseish error object and an object that exports
 * the API into the database.
 */
function initialize(config, callback) {
  /* * * CONFIGURATION * * */
  config = config ? config : { dbopt: {} };
  config.dbopt = config.dbopt ? config.dbopt : {};

  var table_name = config.dbopt.table_name ? config.dbopt.table_name : 'DelayedTasks';
  var db_id = config.dbopt.db_name ? config.dbopt.db_name : 'DelayedTasks.sqlite';
  var poll_timeout = (!isNaN(config.dbopt.poll_timeout)) ? config.dbopt.poll_timeout : 1000;
  var pre_poll = (!isNaN(config.dbopt.pre_poll)) ? config.dbopt.pre_poll : 0;
  var default_timeout = (!isNaN(config.dbopt.default_timeout)) ? config.dbopt.default_timeout : 1000;
  var domain = config.dbopt.domain ? config.dbopt.domain : os.hostname();
  var database = new sqlite3.Database(db_id, initTable);
  /* * * CONFIGURATION end */

/*
 * Internal function for initalizing the database table for tasks.
 */
  function initTable(error) {
    if (error) {
      console.log(error);
      callback(error);
    }

    var try_table_init_n_times = function(rounds_left) {
      database.get("SELECT name FROM sqlite_master WHERE type='table' AND name='" + table_name + "'", function(err, row) {
        if (row) {
          finalizeInitialization();
        }
        else {
          var table = [
            ['id', 'INTEGER PRIMARY KEY'],
            ['at', 'DATETIME'],
            ['task', 'BLOB'],
            ['disabled', 'BOOL']
          ];
          var columns_create = table.map(function(column) { return column.join(' ') }).join(', ');
          var table_init = 'CREATE TABLE IF NOT EXISTS ' + table_name + ' ( ' + columns_create + ' )';

          log.debug('sqlite-adapter', 'Running query:', table_init);

          database.run(table_init, function(error) {
            if (error) {
              if (rounds_left > 1) {
                setTimeout(function() {
                  log.debug('sqlite-adapter', 'Retrying query:', table_init);
                  try_table_init_n_times(rounds_left - 1);
                }, 100 + Math.floor(Math.random() * 900));
              }
              else {
                console.log('Could not initialize sqlite database after 10 tries');
                callback(error);
              }
            }
            else {
              finalizeInitialization();
            }
          });

        }
      });
    };

    try_table_init_n_times(10);
  }

  /*
   * Internal function to construct a timestamp for the database to use.
   */
  function getExpiryTime(task) {
    if (!isNaN(task.after)) {
      return "'now', '+" + task.after + " seconds'";
    } else if (!task.at) {
      task.at = new Date();
    }
    if (task.at.toISOString) {
      return "'" + task.at.toISOString() + "'";
    }
    return "'" + task.at + "'";
  }

/*
 * Saves the JSON-task into the database. The timestamp is calculated from the database
 * clock if the `after` field is defined, else from the injectors clock. On error the
 * callback will be called with an error object, else a number indicating the row
 * identifier is passed to the callback. This function does not provide rollback.
 */
  function saveTask(task, callback) {
    database.serialize(function() {
      var expiry_time = getExpiryTime(task);
      var insertion =
        'INSERT INTO ' + table_name + ' (at, task, disabled) VALUES ' +
        '(datetime(' + expiry_time + "), ?, 'FALSE')";

      log.debug('sqlite-adapter', 'Running query:', insertion);
      database.run(insertion, JSON.stringify(task), function(error) {
        if (error) {
          callback(error);
        }
        callback(error, this.lastID);
      });
    });
  }

/*
 * Starts polling the database for tasks with an expired timestamp
 * that are not disabled. The provided callback is called only after
 * the expiry time of the task is updated if it still satisfied the
 * original query predicate. Callback is called wirha JSON object for
 * each row returned by the query. Each task is updated before the callback
 * with their database id, row id, current timestamp and first_run time. On
 * error the callback is called with an error object The function also
 * exports a mechanism to stop the polling function, which takes an optional
 * callback. This function does not provide rollback.
 */
  function listenTask(callback) {
    setTimeout(poll, poll_timeout);
    var cont = true;
    function poll() {
      database.serialize(function() {
        var predicate =
          "(datetime('now') >= datetime(" + table_name + ".at, '-" +
          pre_poll + " seconds')) " + "AND disabled = 'FALSE'";

        var selection_new =
          'SELECT * FROM ' + table_name + ' WHERE ' + predicate;

        var update_selection =
          'UPDATE ' + table_name + " SET at = datetime('now', '+" +
          default_timeout + " seconds')" + ' WHERE (' + table_name +
          '.id = ?) AND ' + predicate;

        log.debug('sqlite-adapter', 'Running query:', selection_new);
        database.all(selection_new, function(error, rows) {
          if (error) {
            callback(error);
          }
          if (rows) {
            rows.forEach(function(row) {
              log.debug('sqlite-adapter', 'Running query:', update_selection);

              database.run(update_selection, row.id, function(error) {
                if (this.changes) {
                  task = JSON.parse(row.task);
                  task.at = new Date(row.at);
                  // task.first_run = task.first_run ? task.first_run : task.at;
                  task.id = row.id;
                  callback(error, task);
                }
              });
            });
          }
          if (cont) setTimeout(poll, poll_timeout);
        });

      });
    }
    return function(callback) {
      cont = false;
      if (callback) callback();
    };
  }

  /*
   * Updates the given task and calls the provided callback.
   * On error the callback is called with an error object, else with a
   * 'null' error object and the number of affected rows.
   * This function does not provide rollback.
   */
  function updateTask(task, callback) {
    database.serialize(function() {
      var expiry_time = getExpiryTime(task);
      var update_task =
        'UPDATE ' + table_name + ' SET task = ?, ' + 'at = datetime(' +
        expiry_time + ') WHERE ' + table_name + '.id = ?';

      log.debug('sqlite-adapter', 'Running query:', update_task);
      database.run(update_task, JSON.stringify(task), task.id, function(error) {
        if (error) {
          callback(error);
        }
        callback(error, this.changes);
      });
    });
  }

  /*
   * Disables the given task from being executed, but does not delete it.
   * If the operation succeeded the callback is called with a 'null' error
   * object and the number of rows affected by the call. On error the
   * only argument is an error object. Does not provide rollback.
   */
  function disableTask(task, callback) {
    database.serialize(function() {
      var update_task =
        'UPDATE ' + table_name + " SET task = ?, disabled = 'TRUE' WHERE " +
        table_name + '.id = ?';

      log.debug('sqlite-adapter', 'Running query:', update_task);
      database.run(update_task, JSON.stringify(task), task.id, function(error) {
        if (error) {
          callback(error);
        }
        callback(error, this.changes);
      });
    });
  }

 /*
   * Deletes the given task from the database. On error the provided
   * callback is called with an error object, else with the number of
   * affected rows. This function does not provide rollback.
   */
  function completeTask(task, callback) {
    database.serialize(function() {
      var delete_task =
        'DELETE FROM ' + table_name + ' WHERE ' + table_name + '.id = ?';

      log.debug('sqlite-adapter', 'Running query:', delete_task);
      database.run(delete_task, task.id, function(error) {
        if (error) {
          callback(error);
        }
        callback(error, this.changes);
      });
    });
  }

  /*
   * Test helpers
   */

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

  function finalizeInitialization() {
    callback(null, {
      saveTask: saveTask,
      listenTask: listenTask,
      updateTask: updateTask,
      completeTask: completeTask,
      disableTask: disableTask,
      testInterfaceWipeDatastore: testInterfaceWipeDatastore,
      testInterfaceGatherEnabledJobMetaList: testInterfaceGatherEnabledJobMetaList
    });
  }
}

function testInterfaceReturnDbopt() {
    return {
      'db_name' : '/tmp/gearloth_test_db.sqlite',
      'poll_timeout' : 100
    };
  }

exports.initialize = initialize;
exports.testInterfaceReturnDbopt = testInterfaceReturnDbopt;
