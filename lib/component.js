var lib = require('./helpers/lib_require');

var util = require('util');
var events = require('events');
var multiserver = lib.require('gearman');
var log = lib.require('log');
var config = lib.require('config');

function Component(component_name, conf) {
  events.EventEmitter.call(this);
  this.component_name = component_name;
  this.debug = conf ? conf.debug : false;
  this._connections = [];
  this._connected = false;

  if (conf.dbconn) {
    this._dbconn = conf.dbconn;
    this.emit('database_initialized');
  }
  else if (component_name != 'controller') {
    this._dbconn = false;
    config.initializeDb(conf, function(error, dbconn) {
      if (error) {
        // TODO Retry this a couple of times and maybe signal instead of dying
        throw error;
      }
      this._dbconn = dbconn;
      this.emit('connection_change');
      this.emit('database_initialized');
    }.bind(this));
  }
  else {
    this._dbconn = true;
  }
}

util.inherits(Component, events.EventEmitter);

Component.prototype.wait_for_first_emit = function(event, callback) {
  var waiter = function() {
    this.removeListener(event, waiter);
    callback(null);
  };
  this.on(event, waiter.bind(this));
};

Component.prototype.disconnect = function(on_disconnect_function) {
  if (this._connections.length) {
    if (on_disconnect_function) {
      this.on('disconnect', on_disconnect_function);
    }
    this._debug('Disconnecting');
    this._connections.forEach(function(connection) {
      connection.disconnect();
    }, this);
  }
  else if (on_disconnect_function) {
    process.nextTick(on_disconnect_function);
  }
};

Component.prototype.registerGearman = function(servers, opts) {
  if (!opts)
    return;

  if (! this._dbconn) {
    var this_opts = opts;
    var this_servers = servers;
    return this.on('database_initialized', function() {
      this.registerGearman(this_servers, this_opts);
    }.bind(this));
  }

  var log_opts = {
    component_name: this.component_name,
    debug: this.debug
  };
  if (opts.worker) {
    this._worker = new multiserver.MultiserverWorker(servers,
        opts.worker.func_name, opts.worker.func, log_opts);
    this._connections.push(this._worker);
  }
  if (opts.workers) {
    opts.workers.forEach(function(worker) {
      this._connections.push(
        new multiserver.MultiserverWorker(
          servers, worker.func_name, worker.func, log_opts
        )
      );
    }, this);
  }
  if (opts.client) {
    this._client = new multiserver.MultiserverClient(servers, log_opts);
    this._connections.push(this._client);
  }

  this._connections.forEach(function(connection) {
    connection.on('connect', function() { this.emit('connection_change') }.bind(this));
    connection.on('disconnect', function() { this.emit('connection_change') }.bind(this));
  }.bind(this));

  this.on('connection_change', function() {
    var all_connected = true;
    this._connections.forEach(function(connection) {
      if (! connection.connected) {
        all_connected = false;
      }
    }, this);

    if (! this._dbconn) {
      all_connected = false;
    }

    if (all_connected && ! this._connected) {
      this._setConnected();
    }
    if (this._connected && ! all_connected) {
      this._setDisconnected();
    }
  }.bind(this));
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
