var lib = require( '../../lib/helpers/lib_require' );

var _ = require('underscore');
var async = require('async');
var gearman = require('gearman-coffee');
var log = lib.require('log');

var spawn = lib.require('test-helpers/spawn');
var adapter_helper = lib.require('test-helpers/adapter-helper');
var client_helper = lib.require('test-helpers/client-helper');
var Injector = lib.require('daemon/injector').Injector;

var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;

chai.should();
chai.use(sinonChai);
log.setOutput();

suite('(e2e) injector', function() {

  suite('using a real adapter', function() {

    this.timeout(5000);

    var port = 54730;
    var injector;

    setup(function(done) {
      async.series([
        _.partial( spawn.gearmand, port ),
        function(callback) {
          injector = new Injector( {
            db : adapter_helper.return_current_adapter_module(),
            dbopt: adapter_helper.return_normal_dbopt(),
            servers: [ { host : 'localhost', port : port } ]
          } );
          injector.on( 'connect', function() {
            callback();
          } );
        } ], done );
    });

    teardown(function(done) {
      async.series([
        injector.disconnect.bind( injector ),
        client_helper.teardown,
        spawn.teardown,
        _.partial( adapter_helper.test_teardown, injector._dbconn )
        ], done );
    });

    test('should insert job with "at" as is', function( done ) {
      var at_date = new Date( 1000000000000 );
      var job = { at : at_date.toString(), func_name : 'test' };

      async.waterfall( [
        client_helper.async_submit_delayed_job_to_port_and_wait_for_completion( job, port ),
        adapter_helper.async_gather_enabled_job_list( injector._dbconn ),
        function( jobs, callback ) {
          expect( jobs ).to.have.length( 1 );
          expect( jobs[0] ).to.have.property('at' );
          expect( jobs[0].at ).to.equal( at_date.toString() );
          callback();
        }
      ], done )
    });
  });
});


