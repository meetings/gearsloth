var util = require('util');
var component = require('../component');
var defaults = require('../config/defaults');

/**
 * Injector component. Emits 'connect' when at least one server is connected.
 */

function Injector(conf) {
  component.Component.call(this, 'injector', conf);
  var that = this;
  this._default_controller = defaults.controllerfuncname(conf);
  this._dbconn = conf.dbconn;
  this.registerGearman(conf.servers, {
    worker: {
      func_name: 'submitJobDelayed',
      func: function(payload, worker) {
        var task;
        try {
          task = JSON.parse(payload);
        } catch (err) {
          that._err('Error:', err.message);
          worker.done(that.component_name + ': ' + err.message);
          return;
        }

        that._info('Received a task for',
            (task.controller || that._default_controller) +
            '/' + task.func_name);
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
          worker.done(that.component_name +
              ': no function name (func_name) defined in task.');
          return;
        }
        that.inject(task, worker);
      }
    }
  });
};

util.inherits(Injector, component.Component);

Injector.prototype.inject = function(task, worker) {
  var that = this;
  try {
    this._dbconn.saveTask(task, function(err, id) {
      if (err) {
        that._err('Error in adapter saveTask:', err.message);
        worker.done(err.message);
      } else {
        that._debug('Task', task, 'saved');
        worker.complete(id);
      }
    });
  } catch (err) {
    this._err('Error in adapter:', err.message);
    worker.done(err.message);
    this.disconnect();
  };
};

module.exports = function(conf) {
  return new Injector(conf);
};
module.exports.Injector = Injector;
