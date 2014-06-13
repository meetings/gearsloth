var events = require('events');
var util = require('util');
var MultiserverClient = require('../gearman/multiserver-client')
  .MultiserverClient;
var gearsloth = require('../gearsloth');
var logger = require('../log');

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
    that.startPolling();
  });
  this._client.on('disconnect', function(callback) {
    if (that.db_poll_stop)
      that.db_poll_stop();
    if (callback)
      callback(exit);
    logger.info('runner:', 'disconnected');
    that.emit('disconnect');
  });
}

util.inherits(Runner, events.EventEmitter);

Runner.prototype.startPolling = function() {
  var that = this;
  try {
    this.db_poll_stop = this._dbconn.listenTask(function(err, task) {
      if (err) {
        logger.debug("Runner: Error polling database:", err)
        that.stop(1);
        return;
      }

      // check default controller on a best effort basis
      task.controller = task.controller ?
        task.controller : 'retryController';

      that.updateTask(task);
      that.sendToController(task);
    });
  } catch (err) {
    logger.err(err);
    this.stop(1);
  };
};

/**
 * Update the information of the task according to possibly set variables:
 * runner_retry_timeout: how long to wait until anohter runner may retry.
 * Default is 1000 seconds.  runner_retry_count: if zero is reached from
 * non-zero positive value the task is disables else it is decreased or left
 * untouched.
 */

Runner.prototype.updateTask = function(task) {
  var that = this;
  task.after = (!isNaN(task.runner_retry_timeout)) ?
    task.runner_retry_timeout : 1000;

  if (!isNaN(task.runner_retry_count))
    task.runner_retry_count--;

  if (task.runner_retry_count === 0) {
    this._dbconn.disableTask(task, function(error, change) {
        if (error) {
          that.stop(1);
          logger.err(error);
        }
        if (change>0) {
          logger.debug("Runner: Task reached maximum time-to-live: ", task);
        } else {
          logger.debug("Runner: Unable to disable task: ", task);
        }
      });
    }

  this._dbconn.updateTask(task, function(err) {
    if (err) {
      logger.err('runner:', 'Error updating task:', task, err.message);
      that.stop(1);
    }
  });
};

/**
 * Send given task to controller at a precise time.
 * Task must contain valid `.controller`,
 * `.at` and `.runner_retry_timeout` fields.
 */
Runner.prototype.stop = function(exit, callback) {
  this._client.disconnect();
}

Runner.prototype.sendToController = function(task) {
  var task_json = JSON.stringify(task);
  this._client.submitJobBg(task.controller, task_json);
};

module.exports = function(conf) {
  return new Runner(conf);
};

module.exports.Runner = Runner;
