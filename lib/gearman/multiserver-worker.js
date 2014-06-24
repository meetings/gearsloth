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
 * @param {String} component_name
 * @return {Object}
 */

function MultiserverWorker(servers, func_name, callback, component_name) {
  var that = this;
  Multiserver.call(this, servers, function(server, index) {
    return new gearman.Worker(func_name, function(payload, worker) {
      that._debug('received job from', that._serverString(index));
      return callback(payload, worker);
    }, server);
  }, (component_name ? component_name + ': ' : '') + 'worker');
}

util.inherits(MultiserverWorker, Multiserver);

module.exports.MultiserverWorker = MultiserverWorker;
