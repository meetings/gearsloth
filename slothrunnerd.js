var gearman 	= require('gearman-coffee');
var gearsloth	= require('./lib/gearsloth');
var config	= require('./config');
var database	= require('./lib/adapters/sqlite');

var Client = gearman.Client;
var dispatcher = new Client();

var dbconn = database.initializeWithHandle("DelayedTasks.sqlite");

console.log("jotain");

database.readNextTasks(function (task) {
  console.log(task);
});

console.log("jotain");


dbconn.close();
