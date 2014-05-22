var chai = require("chai");
var sinon = require('sinon');
var gearman = require('gearman-coffee');
// TODO: change to use sqlite adapter as basis
var adapter = {
  grabTask: function() {}
};
var Passthrough = require("../../lib/strategies/passthrough");

chai.should();

suite('passthrough strategy', function() {
  suite('construction', function() {
    test('can create Passthrough strategy', sinon.test(function() {
      this.stub(gearman);
      var p = new Passthrough(gearman);
      gearman.Worker.calledWithNew().should.be.true;
      gearman.Worker.calledOnce.should.be.true;
    }));
  });
  suite('accepting work', function() {

    var grabbedTask = {
      at: 0,
      func_name: "func_to_call",
      payload: "payload"
    }

    test('should try to grab work', sinon.test(function() {
      this.stub(gearman);
      this.stub(adapter);

      var p = new Passthrough(gearman, adapter);

      var workHandler = gearman.Worker.firstCall.args[1];
      workHandler.call(p, 666);

      adapter.grabTask.calledOnce.should.be.true;
      adapter.grabTask.firstCall.args[0].should.equal(666);
    }));
    test('should send complete packet after grabbing work successfully', sinon.test(function() {
      this.stub(gearman);
      this.stub(adapter);

      adapter.grabTask.callsArgWith(1, null, grabbedTask);
      var clientStub = this.stub({
        submitJob: function() {}
      });
      var p = new Passthrough(gearman, adapter);
      p._client = clientStub;

      var workHandler = gearman.Worker.firstCall.args[1];
      var workerStub = this.stub({
        complete: function() {}
      });
      p._client = this.stub({
        submitJob: function() {}
      })
      workHandler.call(p, 666, workerStub);

      workerStub.complete.calledOnce.should.be.true;
    }));
    test("should send error packet if there's an error", sinon.test(function() {
      this.stub(gearman);
      this.stub(adapter);

      adapter.grabTask.callsArgWith(1, "Errore'd", {});

      var p = new Passthrough(gearman, adapter);

      var workHandler = gearman.Worker.firstCall.args[1];
      var workerStub = this.stub({
        error: function() {}
      });
      workHandler.call(p, 666, workerStub);

      workerStub.error.calledOnce.should.be.true;
    }));
    test('calls correct function after grabbing', sinon.test(function() {
      this.stub(gearman);
      this.stub(adapter);

      adapter.grabTask.callsArgWith(1, null, grabbedTask);
      var clientStub = this.stub({
        submitJob: function() {}
      });
      var p = new Passthrough(gearman, adapter);
      p._client = clientStub;

      var workHandler = gearman.Worker.firstCall.args[1];
      var workerStub = this.stub({
        complete: function() {}
      });
      workHandler.call(p, 666, workerStub)

      workerStub.complete.calledOnce.should.be.true;
      clientStub.submitJob.calledOnce.should.be.true;
      clientStub.submitJob
        .calledWith(grabbedTask.func_name, grabbedTask.payload)
        .should.be.true;
    }));
  });
});
