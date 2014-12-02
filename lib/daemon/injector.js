var lib = require('../helpers/lib_require');

var _ = require('underscore');
var async = require('async');
var log = lib.require('log');

var util = require('util');
var component = lib.require('component');

/**
 * Injector component. Emits 'connect' when at least one server is connected.
 */

function Injector(conf) {
  component.Component.call(this, 'injector', conf);
  this.registerGearman(conf.servers, {
    worker: {
      func_name: 'submitJobDelayed',
      func: function(payload, worker) {
        var task;
        try {
          task = JSON.parse(payload);
        }
        catch (err) {
          this._err('Error:', err.message);
          worker.done(this.component_name + ': Failed to parse task payload ( ' + err.message + ' )');
          return;
        }

        this._info('Received a task for', (task.controller || 'default controller') + '/' + task.func_name);

        try {
          this.check_and_amend_task_for_injection(task);
        }
        catch (error) {
          this._err('Error:', error);
          worker.done(this.component_name + ': Task did not pass validity check ( ' + error + ' )');
          return;
        }

        this.inject(task, worker);
      }.bind(this)
    }
  });
}

util.inherits(Injector, component.Component);

Injector.prototype.check_and_amend_task_for_injection = function(task) {
  if ('after' in task) {
    if (isNaN(task.after)) {
      throw ('invalid "after" format (isNaN)');
    }
    else {
      task.at = new Date(new Date().getTime() + task.after * 1000).toISOString();
    }
  }
  else if ('at' in task) {
    try {
      var date = new Date(task.at);
      if (date.toString() === 'Invalid Date') {
        throw (date);
      }
    }
    catch (error) {
      throw ('invalid "at" date format: ' + error);
    }
  }
  else {
    task.at = new Date().toISOString();
  }

  if (! ('func_name' in task)) {
    throw ('missing func_name');
  }
};

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
  }
};

module.exports = function(conf) {
  return new Injector(conf);
};

module.exports.Injector = Injector;
