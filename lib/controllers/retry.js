var util = require('util');
var events = require('events');
var MultiserverClient = require('../gearman/multiserver-client')
  .MultiserverClient;
var MultiserverWorker = require('../gearman/multiserver-worker')
  .MultiserverWorker;
var logger = require('../log');

var default_retry_timeout = 5;

/**
 * Retry component. Emits 'connect' when at least one server for both
 * worker and client roles are connected to.
 */

function Retry(conf) {
  events.EventEmitter.call(this);
  var that = this;

  this._client = new MultiserverClient(conf.servers);
  this._worker = new MultiserverWorker(conf.servers, 'retryController',
    function (payload, worker) {
      var task = JSON.parse(payload.toString());
      that.workHandler(task, worker);
    });

  logger.info('retry controller started');

  // emit 'connected' if both the worker and client are connected
  this._client.on('connect', function() {
    if (that._worker.connected)
      that._emitConnected();
  });
  this._worker.on('connect', function() {
    if (that._client.connected)
      that._emitConnected();
  });
}

util.inherits(Retry, events.EventEmitter);

Retry.prototype._emitConnected = function() {
  logger.info('controller:', 'connected');
  this.emit('connect');
}

Retry.prototype.workHandler = function(task, worker) {

  worker.complete();

  // parse retry controller specific settings
  handleIntField(task, 'retry_count');
  handleIntField(task, 'retry_timeout');

  if (!task.retry_timeout)
    task.retry_timeout = default_retry_timeout;

  // parse base64 encoded fields TODO: move implementation to library
  if ('payload_base64' in task)
    task.payload = new Buffer(task.payload_base64, 'base64');
  if ('func_name_base64' in task)
    task.func_name = new Buffer(task.func_name_base64, 'base64');

  var that = this;
  function submitRetryJob() {
    var timeout_handle = null;
    logger.info('controller:', 'Trying:', taskString(task));
    if ('retry_count' in task && --task.retry_count == 0) {
      logger.info('controller:', 'Giving up:', taskString(task));
    } else if (!('retry_count' in task) || task.retry_count > 0) {
      timeout_handle = setTimeout(submitRetryJob, task.retry_timeout * 1000);
    }
    that._client.submitJob(task.func_name, task.payload)
      .on('complete', function() {
        logger.info('controller:', 'Completed:', taskString(task));
        that.submitDone(task.id, timeout_handle);
      })
      .on('fail', function() {
        logger.info('controller:', 'Failed:', taskString(task));
        that.submitDone(task.id, timeout_handle);
      });
  }
  submitRetryJob();
};

function taskString(task) {
  return util.inspect(task.id) + ' with func_name: "' + task.func_name + '"';
}

Retry.prototype.submitDone = function(id, timeout_handle) {
  task.retry_count = 0;
  if (timeout_handle)
    clearTimeout(timeout_handle);
  this._client.submitJobBg('delayedJobDone', JSON.stringify({
    id: id
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
