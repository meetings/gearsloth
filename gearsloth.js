var gearman = require('gearman-coffee');
var gearsloth = require('./lib/gearsloth');
var database = require('./adapters/sqlite.js');
var Worker = gearman.Worker;
var Client = gearman.Client;

var client = new Client();

var worker = new Worker('submitJobDelayed', function(payload, worker) {
  var task = gearsloth.decodeTask(payload);
  var timeout = new Date(task.at) - new Date();
  if (timeout < 0)
    timeout = 0;
  setTimeout(function() {
    client.submitJob(task.func_name, task.payload);
  }, timeout);
  return worker.complete();
});
