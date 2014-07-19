var lib = require( '../../lib/helpers/lib_require' );

var _ = require('underscore');
var async = require('async');
var gearman = require('gearman-coffee');
var log = lib.require('log');

var fs = require('fs');
var child_process = require('child_process');

var test_db_path = '/tmp/gearloth_test_db';

function clear_test_path( callback ) {
  fs.exists( test_db_path, function( exists ) {
    if ( exists ) {
      child_process.execFile( '/bin/rm', [ '-Rf', test_db_path ], { timeout : 100 }, callback );
    }
    else {
      callback();
    }
  } );
}

exports.return_current_adapter_module = function() {
  return lib.require('adapters/fs');
};
exports.return_normal_dbopt = function() {
  return {
    'path' : test_db_path,
    'poll_timeout' : 100,
  };
};
exports.test_pre_setup = function( callback ) {
  clear_test_path( callback );
};
exports.test_teardown = function( adapter, callback ) {
  clear_test_path( callback );
};
exports.test_suite_teardown = function( adapter, callback ) {
  clear_test_path( callback );
};

var inject_job_and_wait_for_completion = exports.inject_job_and_wait_for_completion = function( adapter, job, callback ) {
  adapter.saveTask( job, callback );
}

exports.async_inject_job_and_wait_for_completion = function( adapter, job ) {
  var this_adapter = adapter;
  var this_job = job;
  return function( callback ) {
    inject_job_and_wait_for_completion( this_adapter, this_job, callback );
  }
}

var gather_enabled_job_meta_list = exports.gather_enabled_job_meta_list = function( adapter, callback ) {
  adapter.gatherEnabledJobMetaList( callback );
};

exports.async_gather_enabled_job_meta_list = function( adapter ) {
  var this_adapter = adapter;
  return function( callback ) {
    gather_enabled_job_meta_list( this_adapter, callback );
  }
};

var gather_enabled_job_list = exports.gather_enabled_job_list = function( adapter, callback ) {
  gather_enabled_job_meta_list( adapter, function( error, job_meta_list ) {
    if ( error ) {
      callback( error );
    }
    else {
      var job_list = _.map( job_meta_list, function( i ) { return i.job } );

      callback( null, job_list );
    }
  } );
};

exports.async_gather_enabled_job_list = function( adapter ) {
  var this_adapter = adapter;
  return function( callback ) {
    gather_enabled_job_list( this_adapter, callback );
  }
};


