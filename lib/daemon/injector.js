var lib = require('../helpers/lib_require');

var _         = require('underscore');
var async     = require('async');
var util      = require('util');
var component = lib.require('component');

function Injector(conf) {
  component.Component.call(this, 'injector', conf);

  this.registerGearman(conf.servers, {
    worker: {
      func_name: 'submitJobDelayed',
      func: function(payload, worker) {
        var task = null;

        try {
          task = JSON.parse(payload);
        }
        catch (err) {
          this.err('failed to parse payload', err);
          worker.done(err);
          return;
        }

        var ctrl = task.controller || 'default controller';
        this.info('received a task for', ctrl, '/', task.func_name);

        try {
          this.prepare_task_for_injection(task);
        }
        catch (error) {
          this.err('invalid task', error);
          worker.done(error);
          return;
        }

        this.inject(task, worker);
      }.bind(this)
    }
  });
}

util.inherits(Injector, component.Component);

Injector.prototype.prepare_task_for_injection = function(task) {
  if (!('func_name' in task)) {
    throw 'task must have "func_name" property';
  }

  if ('after' in task) {
    var after = parseInt(task.after, 10);

    if (isNaN(after)) {
      throw 'could not parse integer from "after" property';
    }
    else {
      task.at = new Date(Date.now() + after * 1000);
      task.original_after = after;
      delete task.after;
    }
  }
  else if ('at' in task) {
    var at = new Date(task.at);

    if (at.toString() === 'Invalid Date') {
      throw 'could not parse date from "at" property';
    }
    else {
      task.at = at;
    }
  }
  else {
    task.at = new Date();
  }
};

Injector.prototype.inject = function(task, worker) {
  var that = this;
  this._dbconn.saveTask(task, function(err, id) {
    if (err) {
      that.err('task not saved', err.message);
      that.debug(task);
      worker.done(err.message);
    }
    else {
      that.info('task saved with id:', id);
      that.debug(task);
      worker.complete(id);
    }
  });
};

module.exports = function(conf) {
  return new Injector(conf);
};

module.exports.Injector = Injector;
