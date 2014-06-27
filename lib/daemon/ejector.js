var util = require('util');
var component = require('../component');

/**
 * Ejector component. Emits 'connect' when at least one server is connected.
 */

function Ejector(conf) {
  component.Component.call(this, 'ejector', conf);
  var that = this;
  this._dbconn = conf.dbconn;
  this.registerGearman(conf.servers, {
    worker: {
      func_name: 'delayedJobDone',
      func: function(payload, worker) {
        var task = JSON.parse(payload.toString());
        that._info('Received a task with id:', task.id);
        that.eject(task, worker);
      }
    }
  });
}

util.inherits(Ejector, component.Component);

Ejector.prototype.eject = function(task, worker) {
  var that = this;
  try {
    this._dbconn.completeTask(task, function(err) {
      if (err) {
        that._err('Error in database connection:', err.message);
        worker.error(err.message);
      } else {
        that._debug('Task ejected:', task);
        worker.complete();
      }
    });
  } catch (err) {
    this._err('Error:', err.message);
    this.disconnect();
  }
}

module.exports = function(conf) {
  return new Ejector(conf);
};
module.exports.Ejector = Ejector;
