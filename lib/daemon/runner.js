var util = require('util');
var component = require('../component');
var defaults = require('../config/defaults');

/**
 * Runner component. Emits 'connect' when at least one server is connected.
 */
function Runner(conf) {
  component.Component.call(this, 'runner', conf);
  var that = this;
  this._default_controller = defaults.controllerfuncname(conf);
  this._dbconn = conf.dbconn;
  this.registerGearman(conf.servers, { client: true });
  this.on('connect', function() {
    that.startPolling();
  });
  this.on('disconnect', function() {
    if (that.db_poll_stop)
      that.db_poll_stop();
  });
}

util.inherits(Runner, component.Component);

Runner.prototype.startPolling = function() {
  this.db_poll_stop = this._dbconn.listenTask( function( err, task, db_state ) {
    if (err) {
      this._debug('Error polling database:', err.message);
      return this.disconnect();
    }
    if ( db_state ) {
      try {
        this.handleRetryLogicAndExecutionForTask( task, db_state );
      }
      catch ( e ) {
        this._err("Error processing task execution. Trying to disable task.", e, task );
        try {
          this._dbconn.disableListenedTask( task, db_state, function( error ) {
            if ( error ) {
              throw error;
            }
            else {
              this._err("Task disabled after processing error", task );
            }
          } );
        }
        catch ( e ) {
          this._err("Error disabling task after processing error.", e, task );
        }
      }
    }
    else { // TODO remove this legacy adapter mode
      try {
        this.submitTask(null, task);
        this.updateTask(task);
      }
      catch (err) {
        this._err(this.component_name, 'Error:', err.message);
        this.disconnect();
      }
    }
  }.bind(this) );
};

Runner.prototype.handleRetryLogicAndExecutionForTask = function( task, db_state ) {
  var retry_count = isNaN( task.runner_retry_count ) ? 0 : task.runner_retry_count;

  if ( retry_count < 1 ) {
    this._dbconn.disableListenedTask( task, db_state, _.partial( this.submitTask.bind(this), _, task ) );
  }
  else {
    var date = new Date( task.at );
    var delay = isNaN( task.runner_retry_timeout ) ? 1000 : task.runner_retry_timeout;

    task.at = new Date( date.getTime() + delay ).toString();

    task.runner_retry_count = retry_count - 1;

    this._dbconn.updateListenedTask( task, db_state, _.partial( this.submitTask.bind(this), _, task ) );
  }
};

Runner.prototype.submitTask = function(error, task) {
  try {
    if ( error ) {
        throw error;
    }
    var controller = task.controller || this._default_controller;
    var task_json = JSON.stringify(task);

    this._debug('Sending task to controller:', task_json);
    this._client.submitJobBg( controller, task_json );
  }
  catch( e ) {
    this._err( "Error when trying to submit task", e, task );
  }
}

/**
 * Update the information of the task according to possibly set variables:
 * runner_retry_timeout: how long to wait until anohter runner may retry.
 * Default is 1000 seconds.  runner_retry_count: if zero is reached from
 * non-zero positive value the task is disables else it is decreased or left
 * untouched.
 */

Runner.prototype.updateTask = function(task) {
  var that = this;
  task.after = (!isNaN(task.runner_retry_timeout)) ?
    task.runner_retry_timeout : 1000;

  if (!isNaN(task.runner_retry_count))
    task.runner_retry_count--;

  if (task.runner_retry_count === 0) {
    this._dbconn.disableTask(task, function(error, change) {
      if (error) {
        that.disconnect();
        that._err('Error:', error.message);
      }
      if (change > 0) {
        that._debug('Task reached maximum time-to-live:', task);
      } else {
        that._debug('Unable to disable task:', task);
      }
    });
  }

  this._dbconn.updateTask(task, function(err) {
    if (err) {
      that._err('Error updating task:', task, err.message);
      that.disconnect();
    }
  });
};

module.exports = function(conf) {
  return new Runner(conf);
};

module.exports.Runner = Runner;
