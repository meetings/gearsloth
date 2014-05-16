var gearman = require('gearman-coffee');
var Client = gearman.Client;

module.exports = function(config) {
  var client = new Client();
  config.db.listenTasks(function(task) {
    var timeout = task.at - new Date();
    if (timeout < 0)
      timeout = 0;
    setTimeout(function() {
      client.submitJob(task.func_name, task.payload).
      on('complete', function() {}); // do nothing
    }, timeout);
  });

};
