var util = require('util');
var component = require('../component');
var crypto = require('crypto');

// default timeout in seconds
var default_retry_timeout = 5;

/**
 'sqlite-example', * Retry component. Emits 'connect' when at least one server for both
 * worker and client roles are connected to.
 */

function Retry(conf) {
  component.Component.call(this, 'controller', conf);
  var that = this;
  this.default_retry_timeout = default_retry_timeout;
  this.registerGearman(conf.servers, {
    client: true,
    worker: {
      func_name: 'retryController',
      func: function(payload, worker) {
        var task = JSON.parse(payload.toString());
        that.workHandler(task, worker);
      }
    }
  });
}

util.inherits(Retry, component.Component);

Retry.prototype.workHandler = function(task, worker) {
  if (!this._client.connected) {
    this._err('No reachable job servers');
  }

  worker.complete();

  // parse retry controller specific settings
  handleIntField(task, 'retry_count');
  handleIntField(task, 'retry_timeout');

  if (!task.retry_timeout)
    task.retry_timeout = this.default_retry_timeout;

  // parse base64 encoded fields TODO: move implementation to library
  if ('payload_base64' in task)
    task.payload = new Buffer(task.payload_base64, 'base64');
  if ('func_name_base64' in task)
    task.func_name = new Buffer(task.func_name_base64, 'base64');

  // refactoring to a task queue would be nice
  var done = false;
  var that = this;
  var timeout_handle = null;
  function submitRetryJob() {
    if (task.retry_count === 0) {
      done = true;
      that._info('Giving up:', taskString(task));
      return that.submitDone(task);
    } else {
      timeout_handle = setTimeout(submitRetryJob, task.retry_timeout * 1000);
      if (task.retry_count)
        --task.retry_count;
    }
    that._info('Trying:', taskString(task));
    try {
      that._client.submitJob(task.func_name, task.payload)
      .on('complete', function() {
        if (done) return;
        done = true;
        that._info('Completed:', taskString(task));
        that.submitDone(task, timeout_handle);
      })
      .on('fail', function() {
        if (done) return;
        done = true;
        that._info('Failed:', taskString(task));
        that.submitDone(task, timeout_handle);
      });
    } catch (err) {
      that._err('Error:', err.message);
    }
  }
  submitRetryJob();
};

function taskString(task) {
  return util.inspect(task.id) + ' with func_name: "' + task.func_name + '"';
}

Retry.prototype.submitDone = function(task, timeout_handle) {
  if (timeout_handle)
    clearTimeout(timeout_handle);
  this._client.submitJobBg('delayedJobDone', JSON.stringify({
    id: task.id
  }));
};

function handleIntField(task, field) {
  if (field in task) {
    task[field] = parseInt(task[field]);
    if (isNaN(task[field]) || task[field] <= 0)
      delete task[field];
  }
}

module.exports = function(conf) {
  return new Retry(conf);
};
module.exports.Retry = Retry;
