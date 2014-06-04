var events = require('events');
var util = require('util');
var MultiserverClient = require('../gearman/multiserver-client')
  .MultiserverClient;
var gearsloth = require('../gearsloth');
var logger = require('../log');

/**
 * Runner component. Emits 'connect' when at least one server is connected.
 */

function Runner(conf) {
  events.EventEmitter.call(this);
  var that = this;
  this._dbconn = conf.dbconn;
  this._client = new MultiserverClient(conf.servers);
  this._client.on('connect', function() {
    logger.info('runner:', 'connected');
    that.emit('connect');
  });

  try {
    this.db_poll_stop = this._dbconn.listenTask(function(err, task) {
      if (err) {
        logger.debug("Runner: Error polling database:", err)
        this.stop(1);
      }

      // check default controller on a best effort basis
      task.controller = task.controller ?
        task.controller : 'passthroughController';

      that.updateTask(task);
      that.sendToController(task);
    });
  } catch (err) {
    logger.err(err);
    this.stop(1);
  };
}

util.inherits(Runner, events.EventEmitter);

/**
 * Update the information of the task according to possibly set variables:
 * runner_retry_timeout: how long to wait until anohter runner may retry.
 * Default is 1000 seconds.  runner_retry_count: if zero is reached from
 * non-zero positive value the task is disables else it is decreased or left
 * untouched.
 */

Runner.prototype.updateTask = function(task) {
  task.after = (!isNaN(task.runner_retry_timeout)) ?
    task.runner_retry_timeout : 1000;

  task.runner_retry_count = (!isNaN(task.runner_retry_count)) ?
    (--task.runner_retry_count) : undefined;

  if (task.runner_retry_count === 0) {
    this._dbconn.disableTask(task, function(change) {
        if (change>0) {
          logger.debug("Runner: Task reached maximum time-to-live: ", task);
        } else {
          logger.debug("Runner: Unable to disable task: ", task);
        }
      });
    }

  this._dbconn.updateTask(task, function(err) {
    if (err) {
      logger.err('runner:', 'Error updating task:', task, err.message);
      this.stop(1);
    }
      
  });
};

/**
 * Send given task to controller at a precise time.
 * Task must contain valid `.controller`,
 * `.at` and `.runner_retry_timeout` fields.
 */

Runner.prototype.stop = function(exit) {
  // this._client.disconnect();
  if (this.db_poll_stop)
    this.db_poll_stop();
  process.exit(exit);
}

Runner.prototype.sendToController = function(task) {
  var task_json = JSON.stringify(task);
  this._client.submitJobBg(task.controller, task_json);
  // .on('fail', function(handle) {
  //   console.log("Failed to dispatch: ", handle);
  // })
  // .on('complete', function(handle, data){
  //   console.log('complete job: ', handle, data);
  // })
  // .on('created', function(handle) {
  //   console.log('created job: ', handle);
  // })
  // .on('data', function(handle, data) {
  //   console.log('data from job: ', handle, data);
  // })
  // .on('status', function(handle, num, den) {
  //   console.log('status of job: ', handle, num, den);
  // })
  // .on('warning', function(handle, warning) {
  //   console.log('warning from job: ', handle, warning);
  // });
};

module.exports = function(conf) {
  return new Runner(conf);
};

module.exports.Runner = Runner;
