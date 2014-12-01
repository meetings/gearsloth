var events = require('events');
var crypto = require('crypto');
var util = require('util');
var log = require('../log');

function Multiserver(servers, create_connection, component_name) {
  events.EventEmitter.call(this);
  this.connected = false;
  this.component_name = component_name || 'multiserver';
  this._connected_count = 0;
  this._servers = servers || [{ host: 'localhost', port: 4730 }];
  this._connections = this._servers.map(create_connection);
  this._registerListeners();
}

util.inherits(Multiserver, events.EventEmitter);

/** Disconnect all servers */
Multiserver.prototype.disconnect = function() {
  this._debug('disconnecting all servers');
  this._connections.forEach(function(connection) {
    connection.disconnect();
  });
};

Multiserver.prototype._emitConnect = function() {
  this.connected = true;
  this.emit('connect');
};

Multiserver.prototype._emitDisconnect = function() {
  this._debug('all servers disconnected');
  this.connected = false;
  this.emit('disconnect');
};

Multiserver.prototype._registerListeners = function() {
  var that = this;

  this._connections.forEach(function(connection, index) {
    // emit connect when the first client connects
    connection.reconnecter.on('connect', function() {
      that._debug('connected to', that._serverString(index));
      if (++that._connected_count === 1) {
        that._emitConnect();
      }
    });
    connection.reconnecter.on('reconnect', function(n, delay) {
      that._debug(util.format(
        'reconnecting to %s (%s ms delay)', that._serverString(index), delay
      ));
    });
    // emit disconnect if all clients have gone
    connection.reconnecter.on('disconnect', function(err) {
      that._err('disconnected from', that._serverString(index));
      if (err) {
        that._debug(util.inspect(err));
      } else {
        // live connection disconnected
        if (--that._connected_count === 0) {
          that._emitDisconnect();
        }
      }
    });
    // log errors, because I don't know what else I should do
    connection.reconnecter.on('error', function(err) {
      that._err('received error from', that._serverString(index));
      if (err) {
        that._debug(util.inspect(err));
      }
    });
  });
};

// for logging/debugging

Multiserver.prototype._serverString = function(index) {
  var server = this._servers[index];
  return (server.host || 'localhost') + ':' + (server.port || '4730');
};

Multiserver.prototype._debug = function() {
  log.debug.bind(undefined, this.component_name).apply(undefined, arguments);
};

Multiserver.component_prefix = function(component_name) {
  if (component_name)
    return component_name + ': ';
  return '';
};

module.exports = Multiserver;
