var gearman = require('gearman-coffee');
var logger = require('./lib/log.js')
var Client = gearman.Client;

module.exports = function(config) {
  var client = new Client();
  try {
    config.dbconn.listenTask(function(err, task) {
      if (err) return logger.err(err);
      var timeout = task.at - new Date();
      if (timeout < 0)
        timeout = 0;
      setTimeout(function() {
        client.submitJob(task.func_name, task.payload).
        on('complete', function() {}); // do nothing
      }, timeout);
    });
  }
  catch(err) {
    logger.err(err);
  }
};
  