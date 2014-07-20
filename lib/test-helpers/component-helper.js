var lib = require( '../../lib/helpers/lib_require' );

var _ = require('underscore');
var async = require('async');
var log = lib.require('log');

var global_instances = [];

var setup_component_and_wait_for_connect = exports.setup_component_and_wait_for_connect = function( component, conf, callback ) {
  var component_module = ( component == 'controller') ? lib.require( 'controllers/retry' ) : lib.require( 'daemon/' + component );
  var component_instance = component_module( conf );
  global_instances.push( component_instance );
  component_instance.on( 'connect', function() {
    callback();
  } );
}

exports.async_setup_component_and_wait_for_connect = function( component, conf ) {
  var this_component = component;
  var this_conf = conf;
  return function( callback ) {
    setup_component_and_wait_for_connect( this_component, this_conf, callback );
  }
}

exports.teardown = function( done ) {
  async.each( global_instances, function( component, callback ) {
    component.on('disconnect', function() {
      callback();
    } );
    component.disconnect();
  }, function( error ) {
    global_instances = [];
    done( error );
  } );
};

