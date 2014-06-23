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
  this._dbconn = conf.dbconn;
  this._worker = new MultiserverWorker(conf.servers, 'delayedJobDone',
    function(payload, worker) {
      var task = JSON.parse(payload.toString());
      log.info('ejector', 'Received a task with id:',task.id);
      that.eject(task, worker);
    });
  this._worker.on('connect', function() {
    log.info('ejector', 'Connected');
    that.emit('connect');
  });
  this._worker.on('disconnect', function() {
    log.info('ejector', 'Disconnected');
    that.emit('disconnect');
  })
}

util.inherits(Ejector, events.EventEmitter);

Ejector.prototype.disconnect = function() {
  log.debug('ejector', 'Disconnecting...');
  this._worker.disconnect();
}

Ejector.prototype.eject = function(task, worker) {
  try {
    this._dbconn.completeTask(task, function(err) {
      if (err) {
        log.err('ejector', 'Error in database connection:', err.message);
        worker.error(err.message);
      } else {
        log.debug('ejector', 'Task ejected:', task);
        worker.complete();
      }
    });
  } catch (err) {
    log.err('ejector', 'Error:', err.message);
    this.disconnect();
  }
}

module.exports = function(conf) {
  return new Ejector(conf);
};
module.exports.Ejector = Ejector;
