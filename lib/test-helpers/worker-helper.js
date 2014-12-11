var lib = require('../../lib/helpers/lib_require');

var _       = require('underscore');
var async   = require('async');
var gearman = require('gearman-coffee');
var log     = lib.require('log');

var global_running_workers = [];

exports.register_worker_to_port_with_json_payload =
function(controller, port, callback) {
  global_running_workers.push(
    new gearman.Worker(controller, function(payload, worker) {
      callback(JSON.parse(payload.toString()), worker);
    },
    { port: port })
  );
}

exports.teardown = function(done) {
  async.each(global_running_workers, function(worker, callback) {
    worker.socket.on('close', function() {
      callback();
    });
    worker.disconnect();
  }, function(error) {
    global_running_workers = [];
    done();
  })
}
