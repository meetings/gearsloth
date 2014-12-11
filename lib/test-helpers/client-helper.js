var lib = require('../../lib/helpers/lib_require');

var _       = require('underscore');
var async   = require('async');
var gearman = require('gearman-coffee');
var log     = lib.require('log');

var delayed_job_function_name = 'submitJobDelayed';
var global_nonfinalized_clients = [];

var submit_func_for_job =
exports.submit_func_with_json_payload_to_port_and_return_job =
function(func_name, payload, port) {
  var client = new gearman.Client({ port : port });
  global_nonfinalized_clients.push(client);
  return client.submitJob(func_name, JSON.stringify(payload));
}

var submit_func =
exports.submit_func_with_json_payload_to_port_and_wait_for_completion =
function(func_name, payload, port, callback) {
  var job = submit_func_for_job(func_name, payload, port);
  job.on('complete', function() {
    callback();
  });
  job.on('fail', function() {
    throw(new Error("func failed"));
  });
};

exports.async_submit_func_with_json_payload_to_port_and_wait_for_completion =
function(func_name, payload, port) {
  var this_payload = payload;
  return function(callback) {
    submit_func(func_name, this_payload, port, callback);
  }
};

var submit_jof_for_job = exports.submit_delayed_job_to_port_and_return_job =
function(job, port) {
  return submit_func_for_job(delayed_job_function_name, job, port);
}

var submit_job = exports.submit_delayed_job_to_port_and_wait_for_completion =
function(job, port, callback) {
  submit_func(delayed_job_function_name, job, port, callback);
}

exports.async_submit_delayed_job_to_port_and_wait_for_completion =
function(job, port) {
  // TODO: find out why job disappears if it is not stored here :D
  var this_job = job;
  return function(callback) {
    submit_job(this_job, port, callback);
  };
};

exports.teardown = function(done) {
  async.each(global_nonfinalized_clients, function(client, callback) {
    if (client.connected) {
      client.socket.on('close', function() {
        callback();
      });
      client.disconnect();
    }
    else {
      callback();
    }
  }, function(error) {
    global_nonfinalized_clients = [];
    done(error);
  });
};
