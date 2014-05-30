var events = require('events');

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
  Client = Client ? Client : require("gearman-coffee").Client;
  random = random ? random : Math.random;

  var clients = [];
  if(!servers)
    return new Client();
  servers.forEach(function(server) {
    clients.push(new Client(server));
  });

  this.submitJob = function(func_name, payload) {
    return randomClient(clients, random).submitJob(func_name, payload);
  }

  this.submitJobBg = function(func_name, payload) {
    var client = randomClient(clients, random);
    var job = new events.EventEmitter();

    client.queue.push(job);
    client.sendCommand('SUBMIT_JOB_BG', task.controller, false, json);
    job.on('created', function(handle) {
      //  delete job immediately because WORK_COMPLETE is not expected
      delete client.jobs[handle];
    }); 

    return job;
  }

}

function randomClient(clients, random) {
  return clients[Math.floor(random()*clients.length)];
}

module.exports.MultiserverClient = MultiserverClient;
