var gearman = require('gearman-node');
var Ejector = require('../../lib/daemon/ejector').Ejector;
var child_process = require('child_process');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var async = require('async');
var _ = require('underscore');
var spawn = require('../../lib/test-helpers/spawn');

chai.should();
chai.use(sinonChai);

suite('(e2e) ejector', function() {

  this.timeout(5000);

  var port = 54730;
  var adapter = {
    getDomains : function( cb ) { cb( null, [ 'test', 'test2' ] ) }
  };
  var client;
  var conf = {
      dbconn: adapter,
      servers: [{
        host: 'localhost',
        port: port
      }]
    };
  var ejector_in_use;

  setup(function(done) {
    async.series([
      _.partial( spawn.gearmand, port ),
      function(callback) {
        client = new gearman.Client({
          port: port
        });
        client.on('connect', function() {
          ejector_in_use = new Ejector( _.extend( {}, conf ) );
          ejector_in_use.on('connect', function() {
            callback();
          });
        });
      }
      ], done );
  });

  teardown(function(done) {
    async.series([
      function(callback) {
        client.socket.on('close', function() {
          callback();
        });
        client.disconnect();
      },
      _.bind( ejector_in_use.disconnect, ejector_in_use ),
      spawn.teardown,
      ], done );
  });

  test('should delete task from database and send complete message to client', function(done) {
    adapter.completeTask = sinon.stub().callsArgWith(1, null, 1);

    var ejectorArgument = { id: "666" };
    client.submitJob('gearsloth_eject_test', JSON.stringify(ejectorArgument))
      .on('complete', function() {
        adapter.completeTask.should.have.been.calledWith(ejectorArgument);
        done();
      });
  });

  test('should delete task from database and send complete message to client on all domains', function(done) {
    adapter.completeTask = sinon.stub().callsArgWith(1, null, 1);

    var ejectorArgument = { id: "666" };
    client.submitJob('gearsloth_eject_test2', JSON.stringify(ejectorArgument))
      .on('complete', function() {
        adapter.completeTask.should.have.been.calledWith(ejectorArgument);
        done();
      });
  });

  test('should return error message to client when completeTask fails', function(done) {
    adapter.completeTask = sinon.stub().callsArgWith(1, "error");

    var ejectorArgument = { id: "666" };
    client.submitJob('gearsloth_eject_test', JSON.stringify(ejectorArgument))
      .on('fail', function() {
        adapter.completeTask.should.have.been.calledWith(ejectorArgument);
        done();
      });
  });

});
