var events = require('events');
var util = require('util');

/**
 * A gearman worker that supports multiple servers.
 * Contains multiple gearman-coffee workers that are each
 * connected to a different server. The workers all run in
 * the same thread
 *
 * Servers are provided in an array of json-objects, possible fields are:
 *  `.host`:    a string that identifies a gearman job server host
 *  `.port`:    an integer that identifies a geaerman job server port
 *  `.debug`:   a boolean that tells whether debug mode should be used
 *
 * @param {[Object]} servers
 * @param {String} func_name
 * @param {Function} callback
 * @return {Object}
 */

function MultiserverWorker(servers, func_name, callback, Worker) {
  events.EventEmitter.call(this);
  Worker = Worker || require('gearman-coffee').Worker;
  this.connected = false;
  this._connected_count = 0;

  var that = this;
  this._emitConnect = function() {
    ++that._connected_count;
    that.connected = true;
    that.emit('connect');
  };

  this._emitDisconnect = function() {
    that._connected_count = 0;
    that.connected = false;
    that.emit('disconnect');
  };

  if (!servers) {
    this._workers = [ new Worker(func_name, callback) ];
  } else {
    this._workers = servers.map(function(server) {
      return new Worker(func_name, callback, server);
    });
  }

  this._workers.forEach(function(worker) {
    worker.on('connect', that._emitConnect);
    worker.reconnecter.on('disconnect', function() {
      if(--that._connected_count === 0) {
        that._emitDisconnect();
      }
    });
  });
}

util.inherits(MultiserverWorker, events.EventEmitter);

/** Disconnect all workers */
MultiserverWorker.prototype.disconnect = function() {
  this._workers.forEach(function(worker) {
    worker.disconnect();
  });
};

module.exports.MultiserverWorker = MultiserverWorker;
