var events = require('events');
var util = require('util');
var MultiserverClient = require('../gearman/multiserver-client')
  .MultiserverClient;
var gearsloth = require('../gearsloth');
var log = require('../log');

/**
 * Runner component. Emits 'connect' when at least one server is connected.
 */
function Runner(conf) {
  events.EventEmitter.call(this);
  var that = this;
  this.component_name = 'runner';
  this._default_controller = conf.controllername || 'retryController';
  this._dbconn = conf.dbconn;
  this._client = new MultiserverClient(conf.servers,
    {
      component_name: this.component_name,
      debug: conf.verbose > 2
    });
  this._client.on('connect', function() {
    log.info(that.component_name, 'Connected');
    that.emit('connect');
    that.startPolling();
  });
  this._client.on('disconnect', function(callback) {
    if (that.db_poll_stop)
      that.db_poll_stop();
    if (callback)
      callback(exit);
    log.info(that.component_name, 'Disconnected');
    that.emit('disconnect');
  });
}

util.inherits(Runner, events.EventEmitter);

Runner.prototype.startPolling = function() {
  var that = this;
  try {
    this.db_poll_stop = this._dbconn.listenTask(function(err, task) {
      if (err) {
        log.debug(that.component_name, 'Error polling database:', err)
        that.stop(1);
        return;
      }

      // check default controller on a best effort basis
      task.controller = task.controller ?
        task.controller : that._default_controller;

      // all this needs to be done because updateTask modifies the task :(
      var task_JSON = JSON.stringify(task);
      var controller = task.controller;
      that.updateTask(task);
      that.sendToController(task_JSON, controller);
    });
  } catch (err) {
    log.err(this.component_name, 'Error:', err.message);
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
        log.err(that.component_name, 'Error:', error.message);
      }
      if (change>0) {
        log.debug(that.component_name, 'Task reached maximum time-to-live:', task);
      } else {
        log.debug(that.component_name, 'Unable to disable task:', task);
      }
    });
  }

  this._dbconn.updateTask(task, function(err) {
    if (err) {
      log.err(that.component_name, 'Error updating task:', task, err.message);
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

Runner.prototype.sendToController = function(task_json, controller) {
  log.debug(this.component_name, 'Sending task to controller:', task_json);
  this._client.submitJobBg(controller, task_json);
};

module.exports = function(conf) {
  return new Runner(conf);
};

module.exports.Runner = Runner;
