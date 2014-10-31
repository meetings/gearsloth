var events = require('events');
var util = require('util');
var gearman = require('gearman-coffee');
var Multiserver = require('./multiserver');
var log = require('../log');

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
 * @param {Object} options
 */

function MultiserverWorker(servers, func_name, callback, options) {
  var that = this;
  options = options || {};
  Multiserver.call(this, servers, function(server, index) {
    return new gearman.Worker(func_name, function(payload, worker) {
      that._debug(func_name+':', util.inspect(payload, { depth: 1 }));
      return callback(payload, worker);
    }, {
      host: server.host,
      port: server.port,
      debug: options.debug || false
    });
  }, Multiserver.component_prefix(options.component_name) + 'worker');
}

util.inherits(MultiserverWorker, Multiserver);

module.exports.MultiserverWorker = MultiserverWorker;
