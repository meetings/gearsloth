var events      = require('events');
var gearman     = require('gearman-coffee');
var Multiserver = require('./multiserver');
var util        = require('util');

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
  }, [options.component_name || 'unnamed', 'client'].join(': '));
  this._rr_index = -1;    // round robin index
}

util.inherits(MultiserverClient, Multiserver);

/**
 * Selects a connected client and submits a job to it.
 */
MultiserverClient.prototype.submitJob = function(func_name, payload) {
  var index = this._pickConnectedClient();
  this.debug('submitting job to server', this._serverString(index));
  return this._connections[index].submitJob(func_name, payload);
};

/**
 * Selects a connected client and submits a job to it with gearman's
 * SUBMIT_JOB_BG call. This means that the job will be forgotten as soon
 * as it is sent, and no JOB_COMPLETE is expected.
 */
MultiserverClient.prototype.submitJobBg = function(func_name, payload) {
  var that = this;
  var index = this._pickConnectedClient();
  var client = this._connections[index];
  var job = new events.EventEmitter();

  this.debug('submitting background job to', this._serverString(index));

  job.on('created', function(handle) {
    that.info(func_name+':', 'background job created');
    // delete job immediately because WORK_COMPLETE is not expected
    delete client.jobs[handle];
  });
  job.on('error', function(err) {
    that.err(func_name+':', 'unknown error caught');
    that.debug(err);
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
    this.debug('all servers disconnected, buffering to any server');
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
