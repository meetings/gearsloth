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

var Passthrough = require("../../lib/controllers/passthrough").Passthrough;

chai.should();

suite('passthrough controller', function() {

  var sampleTask = {
    id: 666,
    at: 0,
    func_name: "func_to_call",
    payload: "payload"
  }

  suite('construction', function() {
    test('can create Passthrough strategy', function() {
      var p = new Passthrough(function(a) {return null;}, null, null);
    });
  });
  suite('accepting work', function() {
    var sandbox = sinon.sandbox.create();
    var p, workerStub, clientStub, workHandler;

    setup(function() {
      sandbox.stub(gearman);
      sandbox.stub(adapter);
      workerStub = sandbox.stub(worker);
      workerParameter = function(handler) {
        workHandler = handler;
        return workerStub;
      };
      clientStub = sandbox.stub(client);
      p = new Passthrough(workerParameter, clientStub, adapter);
      client.submitJob.returns(new EventEmitter());
    });

    teardown(function() {
      sandbox.restore();
    });

    test('should send complete packet after grabbing work successfully', function() {
      workHandler.call(p, sampleTask, workerStub);

      workerStub.complete.calledOnce.should.be.true;
    });
    test('calls correct function after grabbing', function() {
      workHandler.call(p, sampleTask, workerStub)

      workerStub.complete.calledOnce.should.be.true;
      clientStub.submitJob.calledOnce.should.be.true;
      clientStub.submitJob
        .calledWith(sampleTask.func_name, sampleTask.payload)
        .should.be.true;
    });
  });
  suite('_runTask', function() {
    var sandbox = sinon.sandbox.create();
    var p, workerStub, clientStub;

    setup(function() {
      sandbox.stub(gearman);
      sandbox.stub(adapter);
      workerStub = sandbox.stub(worker);
      clientStub = sandbox.stub(client);
      workerParameter = function(handler) {
        workHandler = handler;
        return workerStub;
      };
      p = new Passthrough(workerParameter, clientStub, adapter);
    });

    teardown(function() {
      sandbox.restore();
    });

    test('sets task state on complete', sinon.test(function() {
      var emitter = new EventEmitter();
      p._client.submitJob = function(func_name, payload) {
        return emitter;
      };

      p._runTask(sampleTask);
      emitter.emit('complete');

      adapter.updateTask.calledWith(sampleTask.id, 'DONE').should.be.true;
    }));
    test('sets task state on failure', sinon.test(function() {
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
