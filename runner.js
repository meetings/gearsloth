var gearman = require('gearman-coffee');
var Client = gearman.Client;

module.exports = function(config) {
  var client = new Client();
  config.dbconn.listenTask(function(err, task) {
    if (err) return console.error('error reading task');
    var timeout = task.at - new Date();
    if (timeout < 0)
      timeout = 0;
    setTimeout(function() {
      client.submitJob(task.func_name, task.payload).
      on('complete', function() {}); // do nothing
    }, timeout);
  });

};
