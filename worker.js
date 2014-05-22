var gearman = require('gearman-coffee');
var gearsloth = require('./lib/gearsloth');
var Worker = gearman.Worker;

module.exports = function(config) {

  // adapter backend
  function save(task, worker) {
    config.dbconn.saveTask(task, function(err) {
      if (err) console.error(err);
      return worker.complete();
    });
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
