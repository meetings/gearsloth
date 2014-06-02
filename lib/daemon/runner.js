var events = require('events');
var MultiserverClient = require('../gearman/multiserver-client').MultiserverClient;
var gearsloth = require('../gearsloth');
var logger = require('../log')

module.exports = function(conf) {
  var client = new MultiserverClient(conf.servers);

  try {
    conf.dbconn.listenTask(function(err, task) {
      if (err) return logger.err(err);

      // check default controller on a best effort basis
      task.controller = task.controller ? task.controller : 'passthroughController';

      sendToController(task);
      updateTask(task);
    });
  }
  catch(err) {
    logger.err(err);
    process.exit(1);
  };

  /**
   * Update the information of the task according to possibly set variables:
   * runner_retry_timeout: how long to wait until anohter runner may retry. Default is 1000 seconds.
   * runner_retry_coun: if zero is reached from non-zero positive value the task is disables
   * else it is decreased or left untouched.
   */
  function updateTask(task) {
    task.after = (!isNaN(task.runner_retry_timeout)) ? task.runner_retry_timeout : 1000;
    task.runner_retry_count = (!isNaN(task.runner_retry_count)) ? (--task.runner_retry_count) : undefined;
    
    if (task.runner_retry_count === 0){
      conf.dbconn.disableTask(task, function(change) {
        if (change) {
          logger.log("Runner: Task reached maximum time-to-live: "+ task);
        }
      });
    }

    conf.dbconn.updateTask(task, function(err) {
      if (err) logger.error('Runner: Error updating task: '+ task + '\n' + err.message);
    });
  }

  /**
   * Send given task to controller at a precise time.
   * Task must contain valid `.controller`,
   * `.at` and `.runner_retry_timeout` fields.
   */
  function sendToController(task) {
    var timeout = task.at - new Date();
    if (timeout < 0) {
      timeout = 0;
    }

    setTimeout(function() {
      var task_json = JSON.stringify(task);
      client.submitJob(task.controller, task_json);
    }, timeout);
  }
};
