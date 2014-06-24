var util = require('util');
var events = require('events');
var MultiserverWorker = require('../gearman/multiserver-worker')
  .MultiserverWorker;
var gearsloth = require('../gearsloth');
var log = require('../log');

/**
 * Ejector component. Emits 'connect' when at least one server is connected.
 */

function Ejector(conf) {
  events.EventEmitter.call(this);
  var that = this;
  this.component_name = 'ejector';
  this._dbconn = conf.dbconn;
  this._worker = new MultiserverWorker(conf.servers, 'delayedJobDone',
    function(payload, worker) {
      var task = JSON.parse(payload.toString());
      log.info('ejector', 'Received a task with id:',task.id);
      that.eject(task, worker);
    }, this.component_name);
  this._worker.on('connect', function() {
    log.info(that.component_name, 'Connected');
    that.emit('connect');
  });
  this._worker.on('disconnect', function() {
    log.info(that.component_name, 'Disconnected');
    that.emit('disconnect');
  })
}

util.inherits(Ejector, events.EventEmitter);

Ejector.prototype.disconnect = function() {
  log.debug(this.component_name, 'Disconnecting...');
  this._worker.disconnect();
}

Ejector.prototype.eject = function(task, worker) {
  try {
    this._dbconn.completeTask(task, function(err) {
      if (err) {
        log.err(this.component_name, 'Error in database connection:', err.message);
        worker.error(err.message);
      } else {
        log.debug(this.component_name, 'Task ejected:', task);
        worker.complete();
      }
    });
  } catch (err) {
    log.err(this.component_name, 'Error:', err.message);
    this.disconnect();
  }
}

module.exports = function(conf) {
  return new Ejector(conf);
};
module.exports.Ejector = Ejector;
