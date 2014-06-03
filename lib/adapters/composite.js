
module.exports.initialize = initialize;

function Compositeadapter(config, databases) {
  this._databases = databases;
}

function initialize(config, callback, config_helper) {
  config_helper = config_helper ? config_helper : require('../config/index');

  if(!config.dbopt || !(config.dbopt instanceof Array)) {
    callback(new Error('conf.dbopt should be an Array, can\'t initialize composite adapter'));
    return;
  }

  var databases = new Array();
  populateDbconnsArray(config, databases, config_helper);

  var adapter = new Compositeadapter(config, databases);
  callback(null, adapter);
}

Compositeadapter.prototype.saveTask = function(task, callback) {
  this._pickDb().dbconn.saveTask(task, callback);
};

Compositeadapter.prototype.listenTask = function(callback) {
};

Compositeadapter.prototype.updateTask = function(task, callback) {
};

Compositeadapter.prototype.completeTask = function(task, callback) {
};

Compositeadapter.prototype._pickDb = function() {
  var random = Math.random;
  return this._databases[Math.floor(random()*this._databases.length)];
}

function populateDbconnsArray(config, databases, config_helper) {
  config.dbopt.forEach(function(dbconf) {
    config_helper.initializeDb(dbconf, function(err, augmented_conf) {
      if(err) {
        throw new Error('Could not initialize a db connection: ' + err.message);
      }
      databases.push({
        db_id: dbconf.db_id,
        dbconn: augmented_conf.dbconn
      });
    });
  });
}
