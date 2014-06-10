var util = require('util');
var events = require('events');
var MultiserverWorker = require('../gearman/multiserver-worker')
  .MultiserverWorker;
var gearsloth = require('../gearsloth');
var logger = require('../log');

/**
 * Injector component. Emits 'connect' when at least one server is connected.
 */

function Injector(conf) {
  events.EventEmitter.call(this);
  var that = this;
  this._dbconn = conf.dbconn;
  this._worker = new MultiserverWorker(conf.servers, 'submitJobDelayed',
    function(payload, worker) {
      var task = JSON.parse(payload);
      // TODO: Properly abstract date handling into lib/gearsloth.js and handle
      // invalid dates etc.
      if ('at' in task) {
        task.at = new Date(task.at);
        if (isNaN(task.at.getTime())) {
          worker.done("Injector: invalid date format.");
          return;
        }
      } 
      if ('after' in task && isNaN(task.after)) {
        worker.done("Injector: invalid 'after' format.");
        return;
      } 
      if (! ('func_name' in task)) {
        worker.done("Injector: no function name (func_name) defined in task.");
        return;
      }
      that.inject(task, worker);
    });
  this._worker.on('connect', function() {
    logger.info('injector:', 'connected');
    that.emit('connect');
  });
  this._worker.on('disconnect', function() {
    logger.info('injector',  'disconnected');
    that.emit('disconnect');
  });
};

util.inherits(Injector, events.EventEmitter);

Injector.prototype.disconnect = function(exit, callback) {
  this._worker.disconnect();
  if (callback) callback(exit);
};

Injector.prototype.inject = function(task, worker) {
  var that = this;
  try {
    this._dbconn.saveTask(task, function(err, id) {
      if (err) {
        logger.err('injector: Error in adapter saveTask:', err.message);
        worker.done(err.message);
        that.disconnect(1);
      } else {
        worker.complete(id);
      }
    });
  } catch (err) {
    logger.err('injector: Error in adapter:', err.message);
    this.disconnect(1);
  };
};

module.exports = function(conf) {
  return new Injector(conf);
};
module.exports.Injector = Injector;
