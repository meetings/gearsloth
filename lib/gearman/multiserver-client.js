var events = require('events');
var util = require('util');

/**
 * A gearman client that supports multiple servers.
 * Contains multiple gearman-coffee clients that are each
 * connected to a different server. The client which submits a job
 * is selected with round robin.
 *
 * Servers are provided in an array of json-objects, possible fields are:
 *  `.host`:    a string that identifies a gearman job server host
 *  `.port`:    an integer that identifies a geaerman job server port
 *  `.debug`:   a boolean that tells whether debug mode should be used
 *
 * @param {[Object]} servers
 * @return {Object}
 */

function MultiserverClient(servers, Client) {
  events.EventEmitter.call(this);
  Client = Client || require("gearman-coffee").Client;
  this.connected = false;
  this._rr_index = -1;    // round robin index
  this._connected_count = 0;

  if (!servers) {
    this._clients = [ new Client() ];
  } else {
    this._clients = servers.map(function(server) {
      return new Client(server);
    });
  }

  this._registerListeners();

}

util.inherits(MultiserverClient, events.EventEmitter);

MultiserverClient.prototype.submitJob = function(func_name, payload) {
  return this._pickConnectedClient().submitJob(func_name, payload);
};

MultiserverClient.prototype.submitJobBg = function(func_name, payload) {
  var client = this._pickConnectedClient();
  var job = new events.EventEmitter();

  client.queue.push(job);
  client.sendCommand('SUBMIT_JOB_BG', func_name, false, payload);
  job.on('created', function(handle) {
    // delete job immediately because WORK_COMPLETE is not expected
    delete client.jobs[handle];
  });

  return job;
};

/** Disconnect all clients */
MultiserverClient.prototype.disconnect = function() {
  this._clients.forEach(function(client) {
    client.disconnect();
  });
};

/** Returns a connected client from the clients array */
MultiserverClient.prototype._pickConnectedClient = function() {
  var counter = 0;
  do {
    this._rr_index = (this._rr_index + 1) % this._clients.length;
    ++counter;
  } while ((!this._clients[this._rr_index].connected) &&
            counter < this._clients.length &&
            this.connected);

  // if(counter === this._clients.length) { // We've seen it all
  //   this._emitDisconnect();              // and it's time to give up
  // }

  return this._clients[this._rr_index];
};

MultiserverClient.prototype._registerListeners = function() {
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

  this._clients.forEach(function(client) {
    client.on('connect', that._emitConnect);
    // emit disconnect if all clients have discoed
    client.reconnecter.on('disconnect', function() {
      if(--that._connected_count === 0) {
        that._emitDisconnect();       
      }
    });
  });
};

module.exports.MultiserverClient = MultiserverClient;
