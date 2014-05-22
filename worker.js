var gearman = require('gearman-coffee');
var gearsloth = require('./lib/gearsloth');
var logger = require('./lib/log');
var Worker = gearman.Worker;

module.exports = function(config) {

  // adapter backend
  function save(task, worker) {
    try {
      config.dbconn.saveTask(task, function(err) {
        if (err) logger.err(err);
        return worker.complete();
      });
    }
    catch(err) {
      logger.err(err);
    };
  }

  // gearman interface
  var w_bin = new Worker('submitJobDelayed', function(payload, worker) {
    var task = gearsloth.decodeTask(payload);
    save(task, worker);
  });
  var w_json = new Worker('submitJobDelayedJson', function(payload, worker) {
    var task = gearsloth.decodeJsonTask(payload);
    save(task, worker);
  });
};