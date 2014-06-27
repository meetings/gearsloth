var util = require('util');
var events = require('events');
var multiserver = require('./gearman');
var log = require('./log');

function Component(component_name, conf) {
  events.EventEmitter.call(this);
  this.component_name = component_name;
  this.debug = conf ? conf.debug : false
}

util.inherits(Component, events.EventEmitter);

Component.prototype.disconnect = function() {
  if (this._client || this._worker)
    this._debug('Disconnecting');
  if (this._client)
    this._client.disconnect();
  if (this._worker)
    this._worker.disconnect();
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
  }
  if (opts.client) {
    this._client = new multiserver.MultiserverClient(servers, log_opts);
  }
  // forward connect/disconnect events
  var emitConnected = this._emitConnected.bind(this);
  var emitDisconnected = this._emitDisconnected.bind(this);
  if (opts.worker && opts.client) {
    var that = this;
    this._client.on('connect', function() {
      if (that._worker.connected)
        that._emitConnected();
    });
    this._client.on('disconnect', function() {
      if (that._worker.connected)
        that._emitDisconnected();
    });
    this._worker.on('connect', function() {
      if (that._client.connected)
        that._emitConnected();
    });
    this._worker.on('disconnect', function() {
      if (that._client.connected)
        that._emitDisconnected();
    });
  } else if (opts.worker) {
    this._worker.on('connect', emitConnected);
    this._worker.on('disconnect', emitDisconnected);
  } else if (opts.client) {
    this._client.on('connect', emitConnected);
    this._client.on('disconnect', emitDisconnected);
  }
};

Component.prototype._emitConnected = function() {
  log.info(this.component_name, 'Connected');
  this.emit('connect');
};

Component.prototype._emitDisconnected = function() {
  log.info(this.component_name, 'Disconnected');
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
