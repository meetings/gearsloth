var gearman = require('gearman-coffee');
var logger = require('../log.js')
var Client = gearman.Client;

module.exports = function(conf) {
  var client = new Client();
  try {
    conf.dbconn.listenTask(function(err, task) {
      if (err) return logger.err(err);
      var timeout = task.at - new Date();
      if (timeout < 0)
        timeout = 0;
      setTimeout(function() {
        client.submitJob(task.func_name, task.payload);
      }, timeout);
    });
  }
  catch(err) {
    logger.err(err);
    process.exit(1);
  }
};
