var util = require('util');
var events = require('events');
var multiserver = require('./gearman');
var log = require('./log');

function Component(component_name, conf) {
  events.EventEmitter.call(this);
  this.component_name = component_name;
  this.debug = conf ? conf.debug : false;
  this._dbconn = conf.dbconn;
  this._connections = [];
  this._connected = false;
}

util.inherits(Component, events.EventEmitter);

Component.prototype.disconnect = function() {
  if ( this._connections.length ) {
    this._debug('Disconnecting');
    this._connections.forEach( function( connection ) {
      connection.disconnect();
    }, this );
  }
};

Component.prototype.registerGearman = function(servers, opts) {
  if (!opts)
    return;
  var log_opts = {
    component_name: this.component_name,
    debug: this.debug
  };
  if (opts.worker) {
    this._worker = new multiserver.MultiserverWorker(servers,
        opts.worker.func_name, opts.worker.func, log_opts);
    this._connections.push( this._worker );
  }
  if ( opts.workers ) {
    opts.workers.forEach( function( worker ) {
      this._connections.push(
        new multiserver.MultiserverWorker(
          servers, worker.func_name, worker.func, log_opts
        )
      );
    }, this );
  }
  if (opts.client) {
    this._client = new multiserver.MultiserverClient(servers, log_opts);
    this._connections.push( this._client );
  }

  this._connections.forEach( function( connection ) {
    connection.on( 'connect', function() {
        if ( this._connected ) {
            return;
        }
        var all_connected = true;
        this._connections.forEach( function( connection ) {
          if ( ! connection.connected ) {
            all_connected = false;
          }
        }, this );
        if ( all_connected ) {
            this._setConnected();
        }
    }.bind(this) );
    connection.on( 'disconnect', function() {
        if ( ! this._connected ) {
            return;
        }
        var all_connected = true;
        this._connections.forEach( function( connection ) {
          if ( ! connection.connected ) {
            all_connected = false;
          }
        }, this );
        if ( ! all_connected ) {
            this._setDisconnected();
        }
    }.bind(this) );
  }, this );
};

Component.prototype._setConnected = function() {
  log.info(this.component_name, 'Connected');
  this._connected = true;
  this.emit('connect');
};

Component.prototype._setDisconnected = function() {
  log.info(this.component_name, 'Disconnected');
  this._connected = false;
  this.emit('disconnect');
};

Component.prototype._debug = _log('debug');
Component.prototype._info = _log('info');
Component.prototype._err = _log('err');

exports.Component = Component;

// private

function _log() {
  return function() {
    var that = this;
    return function() {
      log[level]
        .bind(undefined, that.log_opts.component_name)
        .apply(undefined, arguments);
    };
  };
}
