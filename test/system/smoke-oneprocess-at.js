var lib = require( '../../lib/helpers/lib_require' );

var async = require('async');
var _ = require('underscore');
var spawn = lib.require('test-helpers/spawn');

var adapter_helper = lib.require('test-helpers/adapter-helper');
var client_helper = lib.require('test-helpers/client-helper');
var worker_helper = lib.require('test-helpers/worker-helper');
var component_helper = lib.require('test-helpers/component-helper');

var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var chai = require('chai');
var expect = chai.expect;

chai.should();
chai.use(sinonChai);

suite('blackbox: at on-time with "at" parameter', function() {

  this.timeout(5000);

  var port = 54730;

  var conf = {
    db : adapter_helper.return_current_adapter_module(),
    dbopt: adapter_helper.return_normal_dbopt(),
    servers: [ { host : 'localhost', port : port } ]
  };

  setup(function(done) {
    async.series([
      adapter_helper.async_teardown( conf ),
      spawn.async_gearmand( port ),
      component_helper.async_setup_component_and_wait_for_connect( 'injector', conf ),
      component_helper.async_setup_component_and_wait_for_connect( 'runner', conf ),
      component_helper.async_setup_component_and_wait_for_connect( 'controller', conf ),
      component_helper.async_setup_component_and_wait_for_connect( 'ejector', conf ),
    ], done );
  });

  teardown(function(done) {
    async.series([
      component_helper.teardown,
      worker_helper.teardown,
      client_helper.teardown,
      spawn.teardown,
      adapter_helper.async_teardown( conf ),
    ], done );
  });

  test('task is recieved in bottom level worker after timeout expires', function(done){
    var at = new Date( new Date().getTime() + 2000 );
    var task = {
      func_name: 'test',
      payload: '{ "ok" : "1" }',
      at : at.toISOString(),
    };

    worker_helper.register_worker_to_port_with_json_payload( 'test', port, function( data, worker ) {
      worker.complete();
      expect( data ).to.have.property( 'ok', "1" );
      expect( new Date().getTime() ).to.be.within( new Date(at).getTime(), new Date(at).getTime() + 2000 );
      done();
    } );

    client_helper.submit_delayed_job_to_port_and_return_job( task, port );
  });

  test('task is scheduled according to after if after and at are both specified', function(done){
    var start = new Date().getTime();
    var at = new Date( start + 4000 );
    var task = {
      func_name: 'test',
      payload: '{ "ok" : "2" }',
      at : at.toISOString(),
      after : 1
    };

    worker_helper.register_worker_to_port_with_json_payload( 'test', port, function( data ) {
      expect( data ).to.have.property( 'ok', "2" );
      expect( new Date().getTime() ).to.be.within( start + 1000, start + 3000 );
      done();
    } );

    client_helper.submit_delayed_job_to_port_and_return_job( task, port )
    .on('warning', function(err, err2, err3) { console.log( 1, err, err2, err3 )});
  });
});
