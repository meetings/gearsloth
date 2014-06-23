var events = require('events');
var crypto = require('crypto');
var util = require('util');
var log = require('../log');

function Multiserver(servers, create_connection) {
  events.EventEmitter.call(this);
  this.connected = false;
  this.component_name = 'multiserver';
  this._id = this._generateId();
  this._connected_count = 0;
  this._servers = servers || [ { host: 'localhost', port: 4730 } ];
  this._connections = this._servers.map(create_connection);
  this._registerListeners();
}

util.inherits(Multiserver, events.EventEmitter);

Multiserver.prototype._generateId = function() {
  return crypto.pseudoRandomBytes(4).toString('hex');
};

/** Disconnect all servers */
Multiserver.prototype.disconnect = function() {
  this._debug('Disconnecting all servers');
  this._connections.forEach(function(connection) {
    connection.disconnect();
  });
};

Multiserver.prototype._emitConnect = function() {
  this._debug('Connected');
  this.connected = true;
  this.emit('connect');
};

Multiserver.prototype._emitDisconnect = function() {
  this._debug('All servers disconnected');
  this.connected = false;
  this.emit('disconnect');
};

Multiserver.prototype._registerListeners = function() {
  var that = this;

  this._connections.forEach(function(connection, index) {
    // emit connect when the first client connects
    connection.reconnecter.on('connect', function() {
      that._debug('Connected', that._serverString(index));
      if (++that._connected_count === 1) {
        that._emitConnect();
      }
    });
    connection.reconnecter.on('reconnect', function(n, delay) {
      that._debug('Reconnecting', that._serverString(index), '(' +
          n + ' retries, ' + delay + ' ms delay)');
    });
    // emit disconnect if all clients have discoed
    connection.reconnecter.on('disconnect', function(err) {
      if (err) {
        that._debug('Disconnected', that._serverString(index), err.message);
      } else {
        // live connection disconnected
        that._debug('Disconnected', that._serverString(index));
        if (--that._connected_count === 0) {
          that._emitDisconnect();
        }
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
  log.debug
      .bind(undefined, this.component_name + '(' + this._id + ')')
      .apply(undefined, arguments);
};

module.exports = Multiserver;
