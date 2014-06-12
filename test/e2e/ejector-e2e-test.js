var gearman = require('gearman-coffee')
  , ejector = require('../../lib/daemon/ejector')
  , child_process = require('child_process')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , async = require('async')
  , spawn = require('../lib/spawn');

chai.should();
chai.use(sinonChai);

suite('(e2e) ejector', function() {

  this.timeout(5000);

  var port = 54730;
  var gearmand
    , adapter = {}
    , client
    , e
    , conf = {
      dbconn: adapter,
      servers: [{
        host: 'localhost',
        port: port
      }]
    };

  setup(function(done) {
    async.series([
      function(callback) {
        gearmand = spawn.gearmand(port, function(){
          callback();
        });
      },
      function(callback) {
        client = new gearman.Client({
          port: port
        });
        client.on('connect', function() {
          ejector(conf);
          callback();
        });
      }
      ], function(){
        done();
      });
  });

  teardown(function(done) {
    async.series([
      function(callback) {
        client.socket.on('close', function() {
          callback();
        });
        client.disconnect();
      },
      function(callback) {
        spawn.killall([gearmand], function() {
          callback();
        });
      }
      ], function(){
        done();
      })
  });

  test('should delete task from database and send complete message to client', function(done) {
    adapter.completeTask = sinon.stub().callsArgWith(1, null, 1);

    var ejectorArgument = { id: "666" };
    client.submitJob('delayedJobDone', JSON.stringify(ejectorArgument))
      .on('complete', function() {
        adapter.completeTask.should.have.been.calledWith(ejectorArgument);
        done();
      });
  });

  test('should return error message to client when completeTask fails', function(done) {
    adapter.completeTask = sinon.stub().callsArgWith(1, "error");

    var ejectorArgument = { id: "666" };
    client.submitJob('delayedJobDone', JSON.stringify(ejectorArgument))
      .on('fail', function() {
        adapter.completeTask.should.have.been.calledWith(ejectorArgument);
        done();
      });
  });

});
