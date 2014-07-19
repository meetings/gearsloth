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
exports.async_gather_all_jobs = function( adapter ) {
  var this_adapter = adapter;
  return function( callback ) {
    this_adapter.gatherAllJobs( callback );
  }
};
exports.gather_all_jobs = function( adapter, callback ) {
  adapter.gatherAllJobs( callback );
};

