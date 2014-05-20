var gearman = require('gearman-coffee');
var gearsloth = require('./lib/gearsloth');
var Worker = gearman.Worker;

module.exports = function(config) {
  var worker = new Worker('submitJobDelayed', function(payload, worker) {
    var task = gearsloth.decodeJsonTask(payload);
    config.db.saveTask(task, function(err) {
      if (err) console.error(err);
      return worker.complete();
    });
  });
};
