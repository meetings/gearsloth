var gearman = require('gearman-coffee')
  , ejector = require('../../lib/daemon/ejector')
  , child_process = require('child_process')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')

chai.should();
chai.use(sinonChai);

suite('(e2e) ejector', function() {

  var gearmand
    , adapter = {}
    , client
    , e
    , conf = { dbconn: adapter };

  setup(function(done) {
    gearmand = child_process.exec('gearmand');
    client = new gearman.Client();
    client.on('connect', function() {
      ejector(conf);
      done();
    });
  });

  teardown(function(done) {
    gearmand.on('close', function() { done() });
    client.disconnect();
    gearmand.kill();
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
