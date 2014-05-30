var gearman = require('gearman-coffee')
  , ejector = require('../../lib/daemon/ejector')
  , child_process = require('child_process')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')

chai.should();
chai.use(sinonChai);

suite('(e2e) ejector', function() {

  this.timeout(5000);

  var gearmand
    , adapter = {}
    , client
    , e
    , conf = {
      dbconn: adapter,
      servers: [{ host: 'localhost' }]
    };

  setup(function(done) {
    var port = 6660 + Math.floor(Math.random() * 1000);
    conf.servers[0].port = port;

    gearmand = child_process.exec('gearmand -p ' + port);

    client = new gearman.Client({
      port: port
    });

    client.on('connect', function() {
      ejector(conf);
      done();
    });
  });

  teardown(function() {
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
