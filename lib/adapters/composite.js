var logger = require('../log');

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
 * @param {Object} config_helper - A helper to use for initializing adapters (for testing)
 */

function initialize(config, callback, config_helper) {
  config_helper = config_helper ? config_helper : require('../config/index');

  if(!checkConfSanity(config)) {
    callback(new Error('conf.dbopt is not sane, can\'t initialize composite adapter'));
    return;
  }

  var databases = new Array();
  populateDatabasesArray(config, databases, config_helper);

  var adapter = new Compositeadapter(config, databases);
  callback(null, adapter);
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
  if(failcounter >= this._databases.length) {
    callback(new Error('No databases available (maybe they are all down?)'));
    return;
  }

  var db = this._pickDb();
  db.saveTask(task, function(err, row_id) {
    if(err) {
      logger.err(new Error('Unreachable database \''+ db.db_id +'\': ' + err.message));
      _this.saveTask(task, callback, ++failcounter);       // Call saveTask recursively until a working
      return;                                              // database is found.
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
  this._databases.forEach(function(db) {
    db.listenTask(callback);
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
  if(!db) {
    callback(new Error('There is no database with id ' + task.id.db_id));
  }
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
  if(!db) {
    callback(new Error('There is no database with id ' + task.id.db_id));
  }
  db.completeTask(task, callback);
};

/** Pick a db with round robin */
Compositeadapter.prototype._pickDb = function() {
  this._round_robin_index = (this._round_robin_index + 1) % this._databases.length;
  return this._databases[this._round_robin_index];
};

/** Find a db by its id */
Compositeadapter.prototype._findDbById = function(db_id) {
  for(var i=0;i < this._databases.length;++i) {
    if(this._databases[i].db_id === db_id)
      return this._databases[i];
  }
  return null;
};

function checkConfSanity(config) {
  return (config.dbopt &&
           (config.dbopt instanceof Array) &&
           config.dbopt.length > 0);
}

function populateDatabasesArray(config, databases, config_helper) {
  config.dbopt.forEach(function(dbconf) {
    config_helper.initializeDb(dbconf, function(err, augmented_conf) {
      if(err) {
        throw new Error('Could not initialize a db connection: ' + err.message);
      }
      databases.push(augmented_conf.dbconn);
    });
  });
}

