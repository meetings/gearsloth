var gearman = require('gearman-coffee')
  , runner = require('../../lib/daemon/runner')
  , child_process = require('child_process')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , expect = chai.expect;

chai.should();
chai.use(sinonChai);

suite('(e2e) runner', function() {

  this.timeout(1000);

  var gearmand
    , adapter = {}
    , worker
    , e
    , conf = { dbconn: adapter }
    , sample_task = {
        id: 666,
        controller: 'test',
        func_name: 'log',
        mikko: 'jussi',
        jeebo: 'jussi'
        };

  setup(function() {
    gearmand = child_process.exec('gearmand');
  });

  teardown(function() {
    worker.disconnect();
    gearmand.kill('SIGKILL');
  });

  test('should fetch a task from db and pass it on', function(done) {
    worker = new gearman.Worker('test', function(payload, worker) {
      var json = JSON.parse(payload.toString());
      console.log(json);
      expect(json).to.have.property('id', sample_task.id);
      expect(json).to.have.property('func_name', sample_task.func_name);

      done();
    });
    console.log(sample_task);
    adapter.listenTask = sinon.stub().callsArgWith(0, null, sample_task);
    adapter.updateTask = sinon.stub().callsArgWith(1, null);
    runner = runner(conf);
  });
});
