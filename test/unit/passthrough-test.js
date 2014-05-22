var chai = require("chai");
var sinon = require('sinon');
var gearman = require('gearman-coffee');
var EventEmitter = require('events').EventEmitter;
// TODO: change to use sqlite adapter as basis
var adapter = {
  grabTask: function() {},
  updateTask: function() {}
};
var client = {
  submitJob: function() {}
};
var worker = {
  error: function() {},
  complete: function() {}
}

var Passthrough = require("../../lib/strategies/passthrough");

chai.should();

suite('passthrough strategy', function() {

  var sampleTask = {
    id: 666,
    at: 0,
    func_name: "func_to_call",
    payload: "payload"
  }

  suite('construction', function() {
    test('can create Passthrough strategy', sinon.test(function() {
      this.stub(gearman);
      var p = new Passthrough(gearman);
      gearman.Worker.calledWithNew().should.be.true;
      gearman.Worker.calledOnce.should.be.true;
    }));
  });
  suite('accepting work', function() {
    var sandbox = sinon.sandbox.create();
    var workerStub;
    var clientStub;

    setup(function() {
      sandbox.stub(gearman);
      sandbox.stub(adapter);
      workerStub = sandbox.stub(worker);
      clientStub = sandbox.stub(client);
      client.submitJob.returns(new EventEmitter());
    });

    teardown(function() {
      sandbox.restore();
    });

    test('should try to grab work', function() {
      var p = new Passthrough(gearman, adapter);

      var workHandler = gearman.Worker.firstCall.args[1];
      workHandler.call(p, 666);

      adapter.grabTask.calledOnce.should.be.true;
      adapter.grabTask.firstCall.args[0].should.equal(666);
    });
    test('should send complete packet after grabbing work successfully', function() {
      adapter.grabTask.callsArgWith(1, null, sampleTask);

      var p = new Passthrough(gearman, adapter);
      p._client = clientStub;

      var workHandler = gearman.Worker.firstCall.args[1];
      workHandler.call(p, 666, workerStub);

      workerStub.complete.calledOnce.should.be.true;
    });
    test("should send error packet if there's an error", function() {
      adapter.grabTask.callsArgWith(1, "Errore'd", {});

      var p = new Passthrough(gearman, adapter);

      var workHandler = gearman.Worker.firstCall.args[1];
      workHandler.call(p, 666, workerStub);

      workerStub.error.calledOnce.should.be.true;
    });
    test('calls correct function after grabbing', function() {
      adapter.grabTask.callsArgWith(1, null, sampleTask);
      var p = new Passthrough(gearman, adapter);
      p._client = clientStub;

      var workHandler = gearman.Worker.firstCall.args[1];
      workHandler.call(p, 666, workerStub)

      workerStub.complete.calledOnce.should.be.true;
      clientStub.submitJob.calledOnce.should.be.true;
      clientStub.submitJob
        .calledWith(sampleTask.func_name, sampleTask.payload)
        .should.be.true;
    });
  });
  suite('_runTask', function() {
    test('sets task state on complete', sinon.test(function() {
      this.stub(gearman);
      this.stub(adapter);      

      var p = new Passthrough(gearman, adapter);

      var emitter = new EventEmitter();
      p._client.submitJob = function(func_name, payload) {
        return emitter;
      };

      p._runTask(sampleTask);
      emitter.emit('complete');

      adapter.updateTask.calledWith(sampleTask.id, 'DONE').should.be.true;
    }));
    test('sets task state on failure', sinon.test(function() {
      this.stub(gearman);
      this.stub(adapter);

      var p = new Passthrough(gearman, adapter);

      var emitter = new EventEmitter();
      p._client.submitJob = function(func_name, payload) {
        return emitter;
      };

      p._runTask(sampleTask);
      emitter.emit('fail');

      adapter.updateTask.calledWith(sampleTask.id, 'FAIL').should.be.true;

    }));
  });
});
