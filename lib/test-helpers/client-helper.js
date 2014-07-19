var lib = require( '../../lib/helpers/lib_require' );

var _ = require('underscore');
var async = require('async');
var gearman = require('gearman-coffee');
var log = lib.require('log');

exports.async_submit_delayed_job_to_port_and_wait_for_completion = function( job, port ) {
  // TODO: find out why job disappears if it is not stored here :D
  var this_job = job;
  return function( callback ) {
    var client = new gearman.Client( { port : port } );
    var job = client.submitJob('submitJobDelayed', JSON.stringify( this_job ) );
    job.on( 'complete', function() {
      callback()
    } );
    job.on( 'fail', function() { throw( new Error("job failed") ); } );
  };
};

var submit_func = exports.submit_func_with_json_payload_to_port_and_wait_for_completion = function( func_name, payload, port, callback ) {
  var client = new gearman.Client( { port : port } );
  var job = client.submitJob( func_name, JSON.stringify( payload ) );
  job.on( 'complete', function() {
    callback()
  } );
  job.on( 'fail', function() { throw( new Error("func failed") ); } );
};

exports.async_submit_func_with_json_payload_to_port_and_wait_for_completion = function( func_name, payload, port ) {
  var this_payload = payload;
  return function( callback ) {
    submit_func( func_name, this_payload, port, callback );
  }
};
