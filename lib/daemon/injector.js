var util = require('util');
var events = require('events');
var MultiserverWorker = require('../gearman/multiserver-worker')
  .MultiserverWorker;
var gearsloth = require('../gearsloth');
var log = require('../log');

/**
 * Injector component. Emits 'connect' when at least one server is connected.
 */

function Injector(conf) {
  events.EventEmitter.call(this);
  var that = this;
  this.component_name = 'injector';
  this._dbconn = conf.dbconn;
  this._worker = new MultiserverWorker(conf.servers, 'submitJobDelayed',
    function(payload, worker) {
      var task;
      try {
        task = JSON.parse(payload);
      } catch (err) {
        log.err(that.component_name, 'Error:', err.message);
        worker.done(that.component_name + ': ' + err.message);
        return;
      }

      log.info(that.component_name, 'Received a task for',task.controller+'/'+task.func_name);
      // TODO: Properly abstract date handling into lib/gearsloth.js and handle
      // invalid dates etc.
      if ('at' in task) {
        task.at = new Date(task.at);
        if (isNaN(task.at.getTime())) {
          worker.done(that.component_name + ': invalid date format.');
          return;
        }
      }
      if ('after' in task && isNaN(task.after)) {
        worker.done(that.component_name + ': invalid \'after\' format.');
        return;
      }
      if (! ('func_name' in task)) {
        worker.done(that.component_name + ': no function name (func_name) defined in task.');
        return;
      }
      that.inject(task, worker);
    }, this.component_name);
  this._worker.on('connect', function() {
    log.info(that.component_name, 'Connected');
    that.emit('connect');
  });
  this._worker.on('disconnect', function() {
    log.info(that.component_name,  'Disconnected');
    that.emit('disconnect');
  });
};

util.inherits(Injector, events.EventEmitter);

Injector.prototype.disconnect = function(exit, callback) {
  log.debug(this.component_name, 'Disconnecting...');
  this._worker.disconnect();
  if (callback) callback(exit);
};

Injector.prototype.inject = function(task, worker) {
  var that = this;
  try {
    this._dbconn.saveTask(task, function(err, id) {
      if (err) {
        log.err(that.component_name, 'Error in adapter saveTask:', err.message);
        worker.done(err.message);
      } else {
        log.debug(that.component_name, 'Task', task, 'saved');
        worker.complete(id);
      }
    });
  } catch (err) {
    log.err(this.component_name, 'Error in adapter:', err.message);
    worker.done(err.message);
    this.disconnect(1);
  };
};

module.exports = function(conf) {
  return new Injector(conf);
};
module.exports.Injector = Injector;
