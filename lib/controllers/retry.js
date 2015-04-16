var _ = require('underscore');
var util = require('util');
var component = require('../component');

/**
 * Retry component.
 *
 * Emits 'connect' when at least one server for
 * both worker and client roles are connected to.
**/

function Retry(conf) {
  component.Component.call(this, 'controller', conf);

  this.registerGearman(conf.servers, {
    client: true,
    worker: {
      func_name: 'retryController',
      func: _.bind(function(json_string, worker) {
        try {
          // TODO This parsing and meta parameter storing
          //      should be encapsulated into a Task class
          var task = JSON.parse(json_string.toString());
          task._task_json_string = json_string;
          task._task_worker = worker;
          this.execute_task(task);
        }
        catch (e) {
          var msg = 'Error executing retryController with following payload:';
          this.err(msg, json_string);
        }
      }, this)
    }
  });
}

util.inherits(Retry, component.Component);

Retry.prototype.execute_task = function(task) {
  task._task_worker.complete();

  // TODO This validation and Buffer creation should
  //      be encapsulated into a Task class

  if ('func_name_base64' in task) {
    task.func_name = new Buffer(task.func_name_base64, 'base64');
  }
  else if (typeof(task.func_name) !== 'string') {
    var msg = 'Received task without proper func_name:';
    return this.err(msg, taskString(task));
  }

  if ('payload_base64' in task) {
    task.payload = new Buffer(task.payload_base64, 'base64');
  }
  else if ('payload' in task) {
    if (typeof task.payload === 'object') {
      task.payload = JSON.stringify(task.payload);
    }
  }

  if (! task.retry_count) {
    task.retry_count = 0;
  }

  this.execute_task_for_retry_round(task, 1);
};

Retry.prototype.execute_task_for_retry_round = function(task, round) {
  var msg = '';

  if (round > task.retry_count + 1) {
    msg = 'Giving up due to retry count:';
    return this.err(msg, taskString(task));
  }
  if (! this._client.connected) {
    msg = 'Giving up because no job servers available:';
    return this.err(msg, taskString(task));
  }

  this.info('Trying:', taskString(task));

  var guarded_from_multiple_submit_job_emits = false;

  this._client.submitJob(task.func_name, task.payload)
    .on('complete', _.bind(function() {
      if (guarded_from_multiple_submit_job_emits) return;
      guarded_from_multiple_submit_job_emits = true;

      this.info('Task execution completed:', taskString(task));

      this._client.submitJobBg(task.eject_function, task._task_json_string);
    }, this))
    .on('fail', _.bind(function() {
      if (guarded_from_multiple_submit_job_emits) return;
      guarded_from_multiple_submit_job_emits = true;

      this.err('Task execution failed:', taskString(task));

      this.execute_task_for_retry_round(task, round + 1);
    }, this));
};

function taskString(task) {
  return util.inspect(task.id) + ' with func_name: "' + task.func_name + '"';
}

module.exports = function(conf) {
  return new Retry(conf);
};

module.exports.Retry = Retry;
