var lib = require( '../../lib/helpers/lib_require' );

var gearman = require('gearman-coffee');
var Injector = require('../../lib/daemon/injector').Injector;
var child_process = require('child_process');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');
var spawn = require('../../lib/test-helpers/spawn');
var Client = require('gearman-coffee').Client;
var client_helper = lib.require('test-helpers/client-helper');

chai.should();
chai.use(sinonChai);

suite('(e2e) injector', function() {

  suite('using a stubbed adapter that "works",', function() {

    this.timeout(5000);

    var port = 54730;
    var adapter = {};
    var conf = {
      dbconn: adapter,
      servers: [{ host: 'localhost', port: port }]
    };
    var injector_in_use;

    setup(function(done) {
      async.series([
        _.partial( spawn.gearmand, port ),
        function(callback) {
          adapter.saveTask = sinon.stub().yields(null, 1);
          injector_in_use = new Injector(conf)
          .on('connect', function() {
            callback();
          });
        }
        ], done );
    });

    teardown(function(done) {
      async.series([
        client_helper.teardown,
        _.bind( injector_in_use.disconnect, injector_in_use ),
        spawn.teardown,
        ], done );
    });

    test('should call saveTask with the task to be saved', function(done){
      var task = {
        at : new Date().toString(),
        func_name: 'log',
      };

      client_helper.submit_delayed_job_to_port_and_wait_for_completion( task, port, function( error ) {
        expect(adapter.saveTask).to.have.been.calledWith( task );
        done( error );
      } );
    });

    test('should call dateless saveTask with task that has "at"', function(done){
      var task = {
        func_name: 'log',
      };

      client_helper.submit_delayed_job_to_port_and_wait_for_completion( task, port, function( error ) {
        expect(adapter.saveTask).to.have.been.calledWith( sinon.match.has( 'at' ) );
        done( error );
      } );
    });

    test('should return error on invalid date', function(done) {
      var task = {
        at: "ölihnoiö",
        func_name: 'log',
      };

      client_helper.submit_delayed_job_to_port_and_return_job( task, port )
      .on('warning', function(handle, error){
        expect(adapter.saveTask).not.have.been.called;
        expect(error).to.equal("injector: Task did not pass validity check ( invalid \"at\" date format: Invalid Date )");
      })
      .on('fail', function(){
        done();
      });
    })

    test('should return error on invalid after parameter', function(done){
      var task = {
        after: "öoosaf",
        func_name: 'log',
      };

      client_helper.submit_delayed_job_to_port_and_return_job( task, port )
      .on('warning', function(handle, error){
        expect(adapter.saveTask).not.to.have.been.called;
        expect(error).to.equal("injector: Task did not pass validity check ( invalid \"after\" format (isNaN) )");
      })
      .on('fail', function(){
        done();
      });
    });

    test('should return error on missing func_name in task', function(done){
      var task = {
        payload : "random"
      };

      client_helper.submit_delayed_job_to_port_and_return_job( task, port )
      .on('warning', function(handle, error){
        expect(adapter.saveTask).not.to.have.been.called;
        expect(error).to.equal("injector: Task did not pass validity check ( missing func_name )");
      })
      .on('fail', function(){
        done();
      });
    });

  });

  suite('using a stubbed adapter that "fails",', function(){
    this.timeout(5000);

    var port = 54730;
    var adapter = {};
    var injector_in_use;

    var task = {
      at : new Date().toString(),
      func_name: 'log',
    };

    var adapter_error = {
      message : "not working on purpose"
    };

    setup(function(done) {
      async.series([
        _.partial( spawn.gearmand, port ),
        function(callback) {
          adapter = {
            saveTask : sinon.stub().yields(adapter_error, null)
          };
          injector_in_use = new Injector( {
            dbconn: adapter,
            servers: [{ host: 'localhost', port: port }]
          } )
          .on('connect', function() {
            callback();
          });
        }
      ], done );
    });

    teardown(function(done) {
      async.series([
        client_helper.teardown,
        injector_in_use.disconnect.bind( injector_in_use ),
        spawn.teardown,
      ], done );
    });

    test('should call saveTask on adapter on new task but pass error message in warning', function(done) {
      client_helper.submit_delayed_job_to_port_and_return_job( task, port )
      .on('warning', function(handle, error) {
        expect(error).to.equal(adapter_error.message);
      })
      .on('fail', function(handle, error) {
        expect(adapter.saveTask).to.have.been.calledOnce;
        done();
      });
    });

    test('should call saveTask and pass an error in warning event', function(done){
      client_helper.submit_delayed_job_to_port_and_return_job( task, port )
      .on('warning', function(handle, error){
        expect(error).to.equal(adapter_error.message);
      })
      .on('fail', function(handle, error){
        expect(adapter.saveTask).to.have.been.calledWith(task);
        done();
      });
    });
  });

});
