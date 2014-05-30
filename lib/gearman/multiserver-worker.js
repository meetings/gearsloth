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
  Worker = Worker ? Worker : require('gearman-coffee').Worker;

  if(!servers) {
    new Worker(func_name, callback);
  } else {
    servers.forEach(function(server) {
      new Worker(func_name, callback, server);
    });
  }
}

module.exports.MultiserverWorker = MultiserverWorker;
