var util = require('util');
var component = require('../component');
var defaults = require('../config/defaults');

/**
 * Runner component. Emits 'connect' when at least one server is connected.
 */
function Runner(conf) {
  component.Component.call(this, 'runner', conf);
  var that = this;
  this._default_controller = defaults.controllerfuncname(conf);
  this._dbconn = conf.dbconn;
  this.registerGearman(conf.servers, { client: true });
  this.on('connect', function() {
    that.startPolling();
  });
  this.on('disconnect', function() {
    if (that.db_poll_stop)
      that.db_poll_stop();
  });
}

util.inherits(Runner, component.Component);

Runner.prototype.startPolling = function() {
  var that = this;
  try {
    this.db_poll_stop = this._dbconn.listenTask(function(err, task) {
      if (err) {
        that._debug('Error polling database:', err.message);
        return that.disconnect();
      }

      task.controller = task.controller || that._default_controller;

      // all this needs to be done because updateTask modifies the task :(
      var task_JSON = JSON.stringify(task);
      var controller = task.controller;
      that.updateTask(task);
      that.sendToController(task_JSON, controller);
    });
  } catch (err) {
    log.err(this.component_name, 'Error:', err.message);
    this.disconnect();
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
        that.disconnect();
        that._err('Error:', error.message);
      }
      if (change > 0) {
        that._debug('Task reached maximum time-to-live:', task);
      } else {
        that._debug('Unable to disable task:', task);
      }
    });
  }

  this._dbconn.updateTask(task, function(err) {
    if (err) {
      that._err('Error updating task:', task, err.message);
      that.disconnect();
    }
  });
};

Runner.prototype.sendToController = function(task_json, controller) {
  this._debug('Sending task to controller:', task_json);
  this._client.submitJobBg(controller, task_json);
};

module.exports = function(conf) {
  return new Runner(conf);
};
module.exports.Runner = Runner;
