var log = require('../log');
var _ = require('underscore');
var async = require('async');

module.exports.initialize = initialize;

function Compositeadapter(config, databases) {
  this._databases = databases;
  this._round_robin_index = -1;
}

/**
 * A composite adapter that consists of multiple adapters.
 * The adapters may be of a different type.
 *
 * `config.dbopt` should be an array containing JSON-objects
 * that will be used to initialize the individual adapters. This function
 * uses config/index.js's initializeDb-function to initialize the adapters.
 *
 * @param {Object} config - Configuration object as passed from config.js
 * @param {Function} callback
 * @param {Object} config_helper - A testing helper to use for initializing
 */

function initialize(config, callback, config_helper) {
  config_helper = config_helper || require('../config/index');

  if (!checkConfSanity(config)) {
    var msg = 'conf.dbopt is not sane, can\'t initialize composite adapter';
    callback(new Error(msg));
    return;
  }

  populateDatabasesArray(config, config_helper, function(err, databases) {
    if (err)
      return callback(err);
    var adapter = new Compositeadapter(config, databases);
    callback(null, adapter);
  });
}

/**
 * Uses round robin to find a reachable database to which the
 * task is saved.
 *
 * @param {Object} task - Task to save
 * @param {Function} callback
 * @param {number} failcounter - Used internally
 */

Compositeadapter.prototype.saveTask = function(task, callback, failcounter) {
  var _this = this;
  failcounter = isNaN(failcounter) ? 0 : failcounter;

  // this prevents the function from being called recursively indefinitely :P
  if (failcounter >= this._databaseCount()) {
    callback(new Error('No databases available (maybe they are all down?)'));
    return;
  }

  var db = this._pickDb();
  db.saveTask(task, function(err, row_id) {
    if (err) {
      var msg = 'Unreachable database ' + db.db_id + ':\n';
      log.err('composite-adapter', msg + err.message);

      // call saveTask recursively until a working database is found
      _this.saveTask(task, callback, ++failcounter);
      return;
    }
    callback(null, row_id);
  });
};

/**
 * Calls listenTask for all the initialized adapters.
 *
 * @param {Function} callback - Called when a task becomes available
 */

Compositeadapter.prototype.listenTask = function(callback) {
  _.each(this._databases, function(db, db_id) {
    db.listenTask(function(err, task) {
      if (err) callback(err);
      else {
        var task_id = task.id;
        task.id = {
          task_id: task_id,
          db_id: db_id
        };
        console.log(task);
        callback(null, task);
      }
    });
  });
};

/**
 * Updates a task in the database specified by `task.id.db_id`.
 *
 * @param {Object} task
 * @param {Function} callback
 */

Compositeadapter.prototype.updateTask = function(task, callback) {
  var db = this._findDbById(task.id.db_id);
  if (!db) {
    callback(new Error('No database available with id ' + task.id.db_id));
    return;
  }
  task.id = task.id.task_id;
  db.updateTask(task, callback);
};

/**
 * Completes a task in the database specified by `task.id.db_id`.
 *
 * @param {Object} task
 * @param {Function} callback
 */

Compositeadapter.prototype.completeTask = function(task, callback) {
  var db = this._findDbById(task.id.db_id);
  if (!db) {
    callback(new Error('No database available with id ' + task.id.db_id));
    return;
  }
  task.id = task.id.task_id;
  db.completeTask(task, callback);
};

Compositeadapter.prototype.disableTask = function(task, callback) {
  var db = this._findDbById(task.id.db_id);
  if (!db) {
    callback(new Error('No database available with id ' + task.id.db_id));
    return;
  }
  task.id = task.id.task_id;
  db.disableTask(task, callback);
};

/** Pick a db with round robin */
Compositeadapter.prototype._pickDb = function() {
  var db_ids = Object.keys(this._databases);
  this._round_robin_index = (this._round_robin_index + 1) % db_ids.length;
  var db_id = db_ids[this._round_robin_index];
  return this._databases[db_id];
};

/** Find a db by its id */
Compositeadapter.prototype._findDbById = function(db_id) {
  return this._databases[db_id];
};

Compositeadapter.prototype._databaseCount = function() {
  return Object.keys(this._databases).length;
};

function checkConfSanity(config) {
  return (config.dbopt &&
          (config.dbopt instanceof Array) &&
          config.dbopt.length > 0);
}

function populateDatabasesArray(config, config_helper, callback) {
  var databases = {};

  async.each(config.dbopt, function(dbconf, callback) {
    if (!dbconf.db ||  dbconf.db_id === null) {
      callback(new Error('Invalid database config: db or db_id missing'));
    }
    config_helper.initializeDb(dbconf, function(err, augmented_conf) {
      if (err) {
        var msg = 'Could not initialize database connection';
        return callback(new Error(msg + '\n' + err.message));
      }
      databases[dbconf.db_id] = augmented_conf.dbconn;
      callback(null);
    });
  }, function(err) {
    callback(err, databases);
  });
}
