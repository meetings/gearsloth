var util = require('util');
var events = require('events');
var gearman = require('gearman-coffee');
var Multiserver = require('./multiserver');

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
 * @param {Object} options
 */

function MultiserverClient(servers, options) {
  options = options || {};
  Multiserver.call(this, servers, function(server) {
    return new gearman.Client({
      host: server.host,
      port: server.port,
      debug: options.debug || false
    });
  }, Multiserver.component_prefix(options.component_name) + 'client');
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
  var that = this;
  var client = this._connections[index];
  var index = this._pickConnectedClient();
  var job = new events.EventEmitter();

  this._debug('submitting background job to', this._serverString(index));

  job.on('created', function(handle) {
    that._info(func_name+':', 'background job created');
    // delete job immediately because WORK_COMPLETE is not expected
    delete client.jobs[handle];
  });
  job.on('error', function(err) {
    that._err(func_name+':', 'unknown error caught');
    that._debug(util.inspect(err));
  });

  client.queue.push(job);
  client.sendCommand('SUBMIT_JOB_BG', func_name, false, payload);

  return job;
};

/**
 * Returns a connected client from the clients array.
 */

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
