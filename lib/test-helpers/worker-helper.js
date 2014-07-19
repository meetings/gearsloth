var lib = require( '../../lib/helpers/lib_require' );

var _ = require('underscore');
var async = require('async');
var gearman = require('gearman-coffee');
var log = lib.require('log');

var global_running_workers = [];

exports.register_worker_to_port_with_json_payload = function( name, port, callback ) {
  global_running_workers.push(
    new gearman.Worker(name, function(payload, worker) {
    callback( JSON.parse( payload.toString() ) );
  }, { port : port })
  );
}

exports.teardown = function( done ) {
  async.each( global_running_workers, function ( worker, callback ) {
    worker.socket.on('close', function() {
      callback();
    });
    worker.disconnect();

  }, function( error ) {
    global_running_workers = [];
    done();
  } )
}

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

