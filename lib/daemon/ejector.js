var util = require('util');
var events = require('events');
var MultiserverWorker = require('../gearman/multiserver-worker')
  .MultiserverWorker;
var gearsloth = require('../gearsloth');
var logger = require('../log');

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
      that.eject(task, worker);
    });
  this._worker.on('connect', function() {
    logger.info('ejector:', 'connected');
    that.emit('connect');
  });
  this._worker.on('disconnect', function() {
    logger.info('ejector:', 'disconnected');
    that.emit('disconnect');
  })
}

util.inherits(Ejector, events.EventEmitter);

Ejector.prototype.disconnect = function() {
  this._worker.disconnect();
}

Ejector.prototype.eject = function(task, worker) {
  try {
    this._dbconn.completeTask(task, function(err) {
      if (err) {
        logger.err('ejector:', err.message);
        worker.error(err.message);
      } else {
        worker.complete();
      }
    });
  } catch (err) {
    logger.err('ejector:', err.message);
    process.exit(1);
  }
}

module.exports = function(conf) {
  return new Ejector(conf);
};
module.exports.Ejector = Ejector;
