var util = require('util');
var events = require('events');
var gearman = require('gearman-coffee');
var Multiserver = require('./multiserver');
var log = require('../log');

/**
 * A gearman client that supports multiple servers.
 * Contains multiple gearman-coffee clients that are each
 * connected to a different server. The client which submits a job
 * is selected with round robin.
 *
 * Servers are provided in an array of json-objects, possible fields are:
 *  `.host`:    a string that identifies a gearman job server host
 *  `.port`:    an integer that identifies a geaerman job server port
 *  `._debug`:   a boolean that tells whether debug mode should be used
 *
 * @param {[Object]} servers
 * @return {Object}
 */

function MultiserverClient(servers) {
  Multiserver.call(this, servers, function(server) {
    return new gearman.Client(server);
  });
  this.component_name = 'client';
  this._rr_index = -1;    // round robin index
}

util.inherits(MultiserverClient, Multiserver);

/**
 * Selects a connected client and submits a job to it.
 */

MultiserverClient.prototype.submitJob = function(func_name, payload) {
  var index = this._pickConnectedClient();
  this._debug('submitting job to server', this._serverString(index));
  return this._connections[index].submitJob(func_name, payload);
};

/**
 * Selects a connected client and submits a job to it with gearman's
 * SUBMIT_JOB_BG call. This means that the job will be forgotten as soon
 * as it is sent, and no JOB_COMPLETE is expected.
 */

MultiserverClient.prototype.submitJobBg = function(func_name, payload) {
  var index = this._pickConnectedClient();
  this._debug('submitting background job to', this._serverString(index));

  var that = this;
  var client = this._connections[index];
  var job = new events.EventEmitter();
  client.queue.push(job);
  client.sendCommand('SUBMIT_JOB_BG', func_name, false, payload);
  job.on('created', function(handle) {
    that._debug('background job created with handle', handle);
    // delete job immediately because WORK_COMPLETE is not expected
    delete client.jobs[handle];
  });

  return job;
};

/** Returns a connected client from the clients array */
MultiserverClient.prototype._pickConnectedClient = function() {
  if (!this.connected) {
    this._debug('all servers disconnected, buffering to any server');
  }
  var counter = 0;
  do {
    this._rr_index = (this._rr_index + 1) % this._connections.length;
  } while ((!this._connections[this._rr_index].connected) &&
            ++counter < this._connections.length &&
            this.connected);
  return this._rr_index;
};

module.exports.MultiserverClient = MultiserverClient;
