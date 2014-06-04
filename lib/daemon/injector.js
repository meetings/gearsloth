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
      console.log(payload);
      var task = gearsloth.decodeTask(payload);
      that.inject(task, worker);
    });
  this._worker.on('connect', function() {
    logger.info('injector:', 'connected');
    that.emit('connect');
  });
};

util.inherits(Injector, events.EventEmitter);

Injector.prototype.inject = function(task, worker) {
  try {
    this._dbconn.saveTask(task, function(err) {
      if (err) {
        logger.err('injector:', err.message);
        worker.error(err.message);
      } else {
        worker.complete();
      }
    });
  } catch (err) {
    logger.err('injector:', err.message);
    process.exit(1);
  };
};

module.exports = function(conf) {
  return new Injector(conf);
};
module.exports.Injector = Injector;
