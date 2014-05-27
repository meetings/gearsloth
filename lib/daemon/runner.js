var events = require('events');
var gearman = require('gearman-coffee');
var gearsloth = require('../gearsloth');
var logger = require('../log')
var Client = gearman.Client;

// debug ;)

var util = require('util');
var worker = new gearman.Worker('passthroughController',
  function(payload, worker) {
  // assume valid json
  //console.log(util.inspect(JSON.parse(payload.toString())));
});

module.exports = function(conf) {
  var client = new Client();

  try {
    conf.dbconn.listenTask(function(err, task) {
      if (err) return logger.err(err);

      // at this point `task` should the following
      // fields:
      //   REQUIRED {Date}              `.at`
      //   OPTIONAL {String}            `.controller`
      //   OPTIONAL {Integer (seconds)} `.runner_retry_timeout`
      //   OPTIONAL {Integer (seconds)} `.runner_retry_count`

      // check default controller on a best effort basis
      if (!('controller' in task))
        task.controller = 'passthroughController';
      task.controller = task.controller.toString();

      // default retry timeout on a best effort basis (default 1000 seconds)
      task.runner_retry_timeout = parseInt(task.runner_retry_timeout);
      if (isNaN(task.runner_retry_timeout))
        task.runner_retry_timeout = 1000;

      // if retry count is ill defined retry indefinitely
      var retry_count = parseInt(task.runner_retry_count);
      if (isNaN(retry_count)) {
        // if retry_count is unparseable, do not modify
        sendToController(task);
      } else if (retry_count > 0) {
        // modify retry count
        task.runner_retry_count = retry_count - 1;
        sendToController(task);
      } // else if (retry_count === 0) -> ignore task

    });
  }
  catch(err) {
    logger.err(err);
    process.exit(1);
  };

  /**
   * Send given task to controller. Task must contain valid `.controller`,
   * `.at` and `.runner_retry_timeout` fields.
   */

  function sendToController(task) {

    // at this point `task` contains valid `.runner_*` fields

    // the time is now
    var now = new Date(); // js date

    // calculate timeout
    var timeout = task.at - now; // milliseconds since 1970
    if (timeout < 0)
      timeout = 0;

    // set new retry time
    task.at = new Date(now.valueOf() + task.runner_retry_timeout * 1000);

    // set timeout for precise task sending and updateing
    // send job to controller, stringified task should not contain non-JSON
    // objects (except dates which are properly converted to ISO strings)
    setTimeout(function() {
      var json = JSON.stringify(task);

      // update task to db
      conf.dbconn.updateTask(task, function(err) {
        if (err) log.error('Runner: Error updating task:', err.message);
      });

      // use low level API to send SUBMIT_JOB_BG message
      // (TODO abstract this to multiserv lib)
      var job = new events.EventEmitter();
      client.queue.push(job);
      client.sendCommand('SUBMIT_JOB_BG', task.controller, false, json);
      job.on('created', function(handle) {

        // delete job immediately because WORK_COMPLETE is not expected
        delete client.jobs[handle];
      });
    }, timeout);
  }
};
