var lib = require('../helpers/lib_require');

var _         = require('underscore');
var util      = require('util');
var component = lib.require('component');
var defaults  = require('../config/defaults');

function Runner(conf) {
  component.Component.call(this, 'runner', conf);

  var that = this;
  this._default_controller = defaults.controllerfuncname(conf);
  this.registerGearman(conf.servers, { client: true });

  this.on('connect', function() {
    this.debug('runner', 'connect event');
    that.startPolling();
  });
  this.on('disconnect', function() {
    this.debug('runner', 'disconnect event');
    if (that.db_poll_stop) {
      that.db_poll_stop();
    }
  });
}

util.inherits(Runner, component.Component);

Runner.prototype.startPolling = function() {
  this.db_poll_stop = this._dbconn.listenTask(function(err, task, domain, state) {
    if (err) {
      this.debug('error while polling database:', err);
      return this.disconnect();
    }
    try {
      this.retryLogic(task, domain, state);
    }
    catch (e) {
      this.err('error processing task execution, disabling the task', e, task);
      try {
        this._dbconn.disableListenedTask(task, state, function(error) {
          /** FIXME **/
          if (error) {
            throw error;
          }
          else {
            this.err('task disabled', task);
          }
        });
      }
      catch (ee) {
        this.err('failed to disable the after processing error.', ee, task);
      }
    }
  }.bind(this));
};

Runner.prototype.retryLogic = function(task, domain, state) {
  var retry_count = parseInt(task.runner_retry_count, 10);

  if (isNaN(retry_count) || retry_count > 0) {
    var retry_timeout = parseInt(task.runner_retry_timeout, 10);
    var delay = isNaN(retry_timeout)? 1000000: retry_timeout;

    if (_.isUndefined(task.original_at)) {
      task.original_at = task.at;
    }

    task.at = new Date(Date.now() + delay);

    if (!isNaN(retry_count)) {
      if (_.isUndefined(task.original_runner_retry_count)) {
        task.original_runner_retry_count = retry_count;
      }
      task.runner_retry_count = retry_count - 1;
    }

    this._dbconn.updateListenedTask(task, state, _.partial(
      this.submitTask.bind(this), _, task, domain
    ));
  }
  else {
    this._dbconn.disableListenedTask(task, state, _.partial(
      this.submitTask.bind(this), _, task, domain
    ));
  }
};

Runner.prototype.submitTask = function(err, task, domain) {
  if (err === true) {
    this.info('updateable task not found (it might be updated already)');
    return;
  }

  if (err) {
    this.err('failed to update task');
    return;
  }

  var controller = task.controller || this._default_controller;
  var eject_function = domain? 'gearsloth_eject_' + domain: 'gearsloth_eject';
  var json = JSON.stringify(_.extend(task, { eject_function: eject_function }));

  try {
    this.debug('sending task to controller:', json);
    this._client.submitJobBg(controller, json);
  }
  catch (e) {
    this.err('error when trying to submit task', e, task);
  }
};

module.exports = function(conf) {
  return new Runner(conf);
};

module.exports.Runner = Runner;
