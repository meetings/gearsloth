var lib = require( '../../lib/helpers/lib_require' );
var _ = require('underscore');
var async = require('async');
var Injector = lib.require('daemon/injector').Injector;

var return_current_adapter_module = exports.return_current_adapter_module = function() {
  var adapter_name = process.env.GEARSLOTH_TEST_ADAPTER;
  if ( adapter_name ) {
    return require( adapter_name );
  }
  else {
    return lib.require('adapters/fs');
  }
};

exports.return_normal_dbopt = function() {
  return return_current_adapter_module().testInterfaceReturnDbopt();
};

var teardown = exports.teardown = function( conf, callback ) {
  return_current_adapter_module().initialize( conf, function( error, adapter ) {
    adapter.testInterfaceWipeDatastore( callback );
  } );
};

exports.async_teardown = function( conf ) {
  return function( callback ) {
    teardown( conf, callback );
  }
}

var inject_job_and_wait_for_completion = exports.inject_job_and_wait_for_completion = function( adapter, job, callback ) {
  Injector.prototype.check_and_amend_task_for_injection( job );
  adapter.saveTask( job, callback );
}

exports.async_inject_job_and_wait_for_completion = function( adapter, job ) {
  var this_adapter = adapter;
  var this_job = job;
  return function( callback ) {
    inject_job_and_wait_for_completion( this_adapter, this_job, callback );
  }
}

exports.inject_job = function( adapter, job ) {
  inject_job_and_wait_for_completion( adapter, job, function() {} );
}

var gather_enabled_job_meta_list = exports.gather_enabled_job_meta_list = function( adapter, callback ) {
  adapter.testInterfaceGatherEnabledJobMetaList( callback );
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


