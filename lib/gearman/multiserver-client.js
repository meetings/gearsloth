var events = require('events');
var util = require('util');

/**
 * A gearman client that supports multiple servers.
 * Contains multiple gearman-coffee clients that are each
 * connected to a different server. The client which submits a job
 * is selected randomly.
 *
 * Servers are provided in an array of json-objects, possible fields are:
 *  `.host`:    a string that identifies a gearman job server host
 *  `.port`:    an integer that identifies a geaerman job server port
 *  `.debug`:   a boolean that tells whether debug mode should be used
 *
 * @param {[Object]} servers
 * @return {Object}
 */

function MultiserverClient(servers, Client, random) {
  events.EventEmitter.call(this);
  Client = Client || require("gearman-coffee").Client;
  this._random = random || Math.random;
  this.connected = false;

  var that = this;
  function emitConnect() {
    that.connected = true;
    that.emit('connect');
  }

  if (!servers) {
    this._clients = [ new Client() ];
  } else {
    this._clients = servers.map(function(server) {
      return new Client(server);
    });
  }

  this._clients.forEach(function(client) {
    client.on('connect', emitConnect);
  });
}

util.inherits(MultiserverClient, events.EventEmitter);

MultiserverClient.prototype.submitJob = function(func_name, payload) {
  return this._randomClient(this._clients, this._random)
    .submitJob(func_name, payload);
}

MultiserverClient.prototype.submitJobBg = function(func_name, payload) {
  var client = this._randomClient();
  var job = new events.EventEmitter();

  client.queue.push(job);
  client.sendCommand('SUBMIT_JOB_BG', func_name, false, payload);
  job.on('created', function(handle) {
    // delete job immediately because WORK_COMPLETE is not expected
    delete client.jobs[handle];
  });

  return job;
}

/** Returns a random client from the clients array */
MultiserverClient.prototype._randomClient = function() {
  return this._clients[Math.floor(this._random()*this._clients.length) %
    this._clients.length];
}

module.exports.MultiserverClient = MultiserverClient;
