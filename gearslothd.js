var gearman = require('gearman-coffee');
var gearsloth = require('./lib/gearsloth');
var Worker = gearman.Worker;
var Client = gearman.Client;
var database = require('./lib/adapters/sqlite');

var client = new Client();

var worker = new Worker('submitJobDelayed', function(payload, worker) {
  var task = gearsloth.decodeTask(payload);
  var dbconn = database.initializeWithHandle("DelayedTasks.sqlite");
  database.saveTask(task);


  var timeout = new Date(task.at) - new Date();
  if (timeout < 0)
    timeout = 0;
  setTimeout(function() {
    client.submitJob(task.func_name, task.payload);
  }, timeout);
  return worker.complete();
});
