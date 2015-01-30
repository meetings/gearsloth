var lib         = require('./helpers/lib_require');

var events      = require('events');
var util        = require('util');
var log         = lib.require('log');
var config      = lib.require('config');
var multiserver = lib.require('gearman');

function Component(component_name, conf) {
  events.EventEmitter.call(this);

  this._connections = [];
  this._connected = false;
  this.component_name = component_name;
  this.debug_mode = (conf && conf.debug)? conf.debug: false;

  this.err   = tree(component_name, 'err');
  this.note  = tree(component_name, 'note');
  this.info  = tree(component_name, 'info');
  this.debug = tree(component_name, 'debug');

  if (conf.dbconn) {
    this._dbconn = conf.dbconn;
    this.emit('database_initialized');
  }
  else if (component_name !== 'controller') {
    this._dbconn = false;
    config.dbInitialize(conf, function(err, dbconn) {
      if (err) {
        this.err(err);
        this.debug(dbconn);
        throw err;
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
  this.debug('Component: disconnect()');

  if (this._connections.length) {
    this.debug('Component: length is something');

    if (on_disconnect_function) {
      this.debug('Component: ajetaan on_disconnect_function');
      this.on('disconnect', on_disconnect_function);
    }

    this.debug('Component: disconnecting');

    this._connections.forEach(function(connection) {
      this.debug('Component: loop');
      connection.disconnect();
    }, this);
  }
  else if (on_disconnect_function) {
    this.debug('Component: length is not');
    process.nextTick(on_disconnect_function);
  }
};

Component.prototype.registerGearman = function(servers, opts) {
  if (!opts) {
    return;
  }

  if (!this._dbconn) {
    var that = this;
    var this_opts = opts;
    var this_servers = servers;
    return this.on('database_initialized', function() {
      that.debug('event: database initialized');
      this.registerGearman(this_servers, this_opts);
    }.bind(this));
  }

  var log_opts = {
    component_name: this.component_name,
    debug: this.debug_mode
  };

  if (opts.worker) {
    this._worker = new multiserver.MultiserverWorker(
      servers, opts.worker.func_name, opts.worker.func, log_opts
    );
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
    connection.on('error', function() {
      this.emit('connection_change');
    }.bind(this));
    connection.on('connect', function() {
      this.emit('connection_change');
    }.bind(this));
    connection.on('disconnect', function() {
      this.emit('connection_change');
    }.bind(this));
  }.bind(this));

  this.on('connection_change', function() {
    var all_connected = true;
    this._connections.forEach(function(connection) {
      if (!connection.connected) {
        all_connected = false;
      }
    }, this);

    if (!this._dbconn) {
      all_connected = false;
    }

    if (all_connected && !this._connected) {
      this._setConnected();
    }
    if (this._connected && !all_connected) {
      this._setDisconnected();
    }
  }.bind(this));
};

Component.prototype._setConnected = function() {
  this.info('connected');
  this._connected = true;
  this.emit('connect');
};

Component.prototype._setDisconnected = function() {
  this.info('disconnected');
  this._connected = false;
  this.emit('disconnect');
};

exports.Component = Component;

/* From a tree, you get logs.
 */
function tree(name, level) {
  return function() {
    log[level].bind(undefined, name+':').apply(undefined, arguments);
  }.bind(this);
}
