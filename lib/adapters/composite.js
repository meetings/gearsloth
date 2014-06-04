var logger = require('../log');

module.exports.initialize = initialize;

function Compositeadapter(config, databases) {
  this._databases = databases;
  this._rr_index = -1;
}

function initialize(config, callback, config_helper) {
  config_helper = config_helper ? config_helper : require('../config/index');

  if(!config.dbopt || !(config.dbopt instanceof Array)) {
    callback(new Error('conf.dbopt should be an Array, can\'t initialize composite adapter'));
    return;
  }

  var databases = new Array();
  populateDatabasesArray(config, databases, config_helper);

  var adapter = new Compositeadapter(config, databases);
  callback(null, adapter);
}

Compositeadapter.prototype.saveTask = function(task, callback, failcounter) {
  var _this = this;
  failcounter = isNaN(failcounter) ? 0 : failcounter;

  // this prevents the function from being called recursively indefinitely :P
  if(failcounter >= this._databases.length) {
    callback(new Error('No databases available (maybe they are all down?)'));
    return;
  }

  var index = this._pickDbIndex();
  var db_id = this._databases[index].db_id;
  this._databases[index].saveTask(task, function(err, row_id) {
    if(err) {
      logger.err(new Error('Unreachable database \''+ db_id +'\': ' + err.message));
      _this.saveTask(task, callback, ++failcounter);       // Call saveTask recursively until a working
      return;                                              // database is found.
    }
    callback(null, row_id); 
  });
};

Compositeadapter.prototype.listenTask = function(callback) {
  this._databases.forEach(function(db) {
    db.listenTask(callback);
  });
};

Compositeadapter.prototype.updateTask = function(task, callback) {
  var db = this._findDbById(task.id.db_id);
  if(!db) {
    callback(new Error('There is no database with id ' + task.id.db_id));
  }
  db.updateTask(task, callback);
};

Compositeadapter.prototype.completeTask = function(task, callback) {
  var db = this._findDbById(task.id.db_id);
  if(!db) {
    callback(new Error('There is no database with id ' + task.id.db_id));
  }
  db.completeTask(task, callback);
};

Compositeadapter.prototype._pickDbIndex = function() {
  this._rr_index = (this._rr_index + 1) % this._databases.length;
  return this._rr_index;
};

Compositeadapter.prototype._findDbById = function(db_id) {
  for(var i=0;i < this._databases.length;++i) {
    if(this._databases[i].db_id === db_id)
      return this._databases[i];
  }
  return null;
};

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
