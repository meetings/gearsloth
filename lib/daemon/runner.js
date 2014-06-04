var events = require('events');
var util = require('util');
var MultiserverClient = require('../gearman/multiserver-client')
  .MultiserverClient;
var gearsloth = require('../gearsloth');
var logger = require('../log')

/**
 * Runner component. Emits 'connect' when at least one server is connected.
 */

function Runner(conf) {
  events.EventEmitter.call(this);
  var that = this;
  this._dbconn = conf.dbconn;
  this._client = new MultiserverClient(conf.servers);
  this._client.on('connect', function() {
    logger.info('runner:', 'connected');
    that.emit('connect');
  });

  try {
    this._dbconn.listenTask(function(err, task) {
      if (err) return logger.err('runner:', err);

      // check default controller on a best effort basis
      task.controller = task.controller ?
        task.controller : 'passthroughController';

      that.sendToController(task);
      that.updateTask(task);
    });
  } catch (err) {
    logger.err(err);
    process.exit(1);
  };
}

util.inherits(Runner, events.EventEmitter);

/**
 * Update the information of the task according to possibly set variables:
 * runner_retry_timeout: how long to wait until anohter runner may retry.
 * Default is 1000 seconds.  runner_retry_count: if zero is reached from
 * non-zero positive value the task is disables else it is decreased or left
 * untouched.
 */

Runner.prototype.updateTask = function(task) {
  task.after = (!isNaN(task.runner_retry_timeout)) ?
    task.runner_retry_timeout : 1000;
  task.runner_retry_count = (!isNaN(task.runner_retry_count)) ?
    (--task.runner_retry_count) : undefined;

  if (task.runner_retry_count === 0) {
    this._dbconn.disableTask(task, function(change) {
      if (change) {
        logger.info('runner:', 'Task reached maximum time-to-live:', task);
      }
    });
  }

  this._dbconn.updateTask(task, function(err) {
    if (err)
      logger.err('runner:', 'Error updating task:', task, err.message);
  });
};

/**
 * Send given task to controller at a precise time.
 * Task must contain valid `.controller`,
 * `.at` and `.runner_retry_timeout` fields.
 */

Runner.prototype.sendToController = function(task) {
  var that = this;
  var timeout = task.at - new Date();
  if (timeout < 0)
    timeout = 0;

  setTimeout(function() {
    var task_json = JSON.stringify(task);
    that._client.submitJobBg(task.controller, task_json);
  }, timeout);
};

module.exports = function(conf) {
  return new Runner(conf);
};
