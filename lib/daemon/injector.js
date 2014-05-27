var gearman = require('gearman-coffee');
var gearsloth = require('../gearsloth');
var logger = require('../log');
var Worker = gearman.Worker;

module.exports = function(conf) {

  // adapter backend
  function save(task, worker) {
    try {
      conf.dbconn.saveTask(task, function(err) {
        if (err) {
          logger.err(err);
          worker.error();
        } else {
          worker.complete();
        }
      });
    }
    catch(err) {
      logger.err(err);
      process.exit(1);
    };
  }

  // gearman interface
  var injector = new Worker('submitJobDelayed', function(payload, worker) {
    var task = gearsloth.decodeTask(payload);
    save(task, worker);
  });
};
