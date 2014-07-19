var _ = require('underscore');
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
  this.db_poll_stop = this._dbconn.listenTask( function( err, task, domain, db_state ) {
    if (err) {
      this._debug('Error polling database:', err.message);
      return this.disconnect();
    }
    try {
      this.handleRetryLogicAndExecutionForTask( task, domain, db_state );
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
  }.bind(this) );
};

Runner.prototype.handleRetryLogicAndExecutionForTask = function( task, domain, db_state ) {
  var retry_count = isNaN( task.runner_retry_count ) ? 0 : task.runner_retry_count;

  if ( isNaN( task.runner_retry_count ) ) {
    this.submitTask( null, task, domain );
  }
  else if ( task.runner_retry_count < 1 ) {
    this._dbconn.disableListenedTask( task, db_state, _.partial( this.submitTask.bind(this), _, task, domain ) );
  }
  else {
    var date = new Date( task.at );
    var delay = isNaN( task.runner_retry_timeout ) ? 1000000 : task.runner_retry_timeout;

    if ( ! task.original_at ) {
      task.original_at = task.at;
    }
    task.at = new Date( date.getTime() + delay ).toString();

    if ( ! task.original_runner_retry_count ) {
      task.original_runner_retry_count = task.runner_retry_count;
    }
    task.runner_retry_count = task.runner_retry_count - 1;

    this._dbconn.updateListenedTask( task, db_state, _.partial( this.submitTask.bind(this), _, task, domain ) );
  }
};

Runner.prototype.submitTask = function( error, task, domain ) {
  try {
    if ( error ) {
        throw error;
    }
    var controller = task.controller || this._default_controller;
    var eject_function = domain ? 'gearsloth_eject-' + domain : 'gearsloth_eject';

    var task_json = JSON.stringify( _.extend( { eject_function : eject_function }, task ) );

    this._debug('Sending task to controller:', task_json);
    this._client.submitJobBg( controller, task_json );
  }
  catch( e ) {
    this._err( "Error when trying to submit task", e, task );
  }
}

module.exports = function(conf) {
  return new Runner(conf);
};

module.exports.Runner = Runner;
