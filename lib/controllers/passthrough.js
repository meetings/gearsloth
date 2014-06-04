var util = require('util');
var events = require('events');
var MultiserverClient = require('../gearman/multiserver-client')
  .MultiserverClient;
var MultiserverWorker = require('../gearman/multiserver-worker')
  .MultiserverWorker;
var logger = require('../log');

/**
 * Passthrough component. Emits 'connect' when at least one server for both
 * worker and client roles are connected to.
 */

function Passthrough(conf) {
  events.EventEmitter.call(this);
  var that = this;
  this._client = new MultiserverClient(conf.servers);
  this._worker = new MultiserverWorker(conf.servers, 'passthroughController',
    function (payload, worker) {
      var task = JSON.parse(payload.toString());
      that.workHandler(task, worker);
    });
  this._client.on('connect', function() {
    if (that._worker.connected)
      that._emitConnected();
  });
  this._worker.on('connect', function() {
    if (that._client.connected)
      that._emitConnected();
  });
}

util.inherits(Passthrough, events.EventEmitter);

Passthrough.prototype._emitConnected = function() {
  logger.info('controller:', 'connected');
  this.emit('connect');
}

Passthrough.prototype._runTask = function(task) {
  var that = this;
  this._client.submitJob(task.func_name, task.payload)
    .on('complete', function() {
      that._client.submitJob('delayedJobDone', JSON.stringify(task));
    })
    .on('fail', function() {
    });
};

Passthrough.prototype.workHandler = function(task, worker) {
  worker.complete(); // calling complete already so that the runner
                     // doesn't potentially offer work to other controllers
  this._runTask(task);
};

module.exports = function(conf) {
  return new Passthrough(conf);
};
module.exports.Passthrough = Passthrough;
