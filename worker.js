var gearman = require('gearman-coffee');
var gearsloth = require('./lib/gearsloth');
var logger = require('./lib/log');
var Worker = gearman.Worker;

module.exports = function(config) {

  // adapter backend
  function save(task, worker) {
      config.dbconn.saveTask(task, function(err) {
        if (err) logger.err(err);
        return worker.complete();
      });
  }

  // gearman interface
  var w_bin = new Worker('submitJobDelayed', function(payload, worker) {
    try {
      var task = gearsloth.decodeTask(payload);    
      save(task, worker);
    } catch(err) {
      logger.err(err);     
    }
  });

  var w_json = new Worker('submitJobDelayedJson', function(payload, worker) {
    try {
      var task = gearsloth.decodeJsonTask(payload);  
      save(task, worker);
    } catch(err) {
      logger.err(err);
    }
  });
};