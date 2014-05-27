var chai = require("chai");
var expect = chai.expect;
var sinon = require('sinon');
chai.use(require('sinon-chai'));

var EventEmitter = require('events').EventEmitter;

var client = {
  submitJob: function() {}
};
var worker = {
  error: function() {},
  complete: function() {}
}

var Passthrough = require("../../lib/controllers/passthrough").Passthrough;

suite('passthrough controller', function() {
  var sampleTask = {
    id: 666,
    at: 0,
    func_name: "func_to_call",
    payload: "payload"
  }
  var sampleBuffer = new Buffer(JSON.stringify(sampleTask));
  
  suite('construction', function() {
    test('can create Passthrough controller', function() {
      var p = new Passthrough(function(a) {return null;}, null, null);
    });
  });
  suite('initialize()', function() {
    test('exists', function() {
      expect(require("../../lib/controllers/passthrough"))
      .to.be.ok;
    });
  });
  suite('accepting work', function() {
    var sandbox = sinon.sandbox.create();
    var p, workerStub, clientStub, workHandler;

    setup(function() {
      workerStub = sandbox.stub(worker);
      workerParameter = function(handler) {
        workHandler = handler;
        return workerStub;
      };
      clientStub = sandbox.stub(client);
      p = new Passthrough(clientStub, workerParameter);
      client.submitJob.returns(new EventEmitter());
    });

    teardown(function() {
      sandbox.restore();
    });

    test('should send complete packet after grabbing work successfully', function() {
      workHandler.call(p, sampleBuffer, workerStub);

      expect(workerStub.complete).to.have.been.calledOnce;
    });
    test('calls correct functions after grabbing', function() {
      workHandler.call(p, sampleBuffer, workerStub)

      expect(workerStub.complete).to.have.been.calledOnce;
      expect(clientStub.submitJob).to.have.been.called;
      expect(clientStub.submitJob)
        .to.have.been
        .calledWith(sampleTask.func_name, sampleTask.payload)
    });
  });
  suite('_runTask()', function() {
    var sandbox = sinon.sandbox.create();
    var p, workerStub, clientStub, emitter;

    setup(function() {
      workerStub = sandbox.stub(worker);
      clientStub = sandbox.stub(client);
      workerParameter = function(handler) {
        workHandler = handler;
        return workerStub;
      };
      p = new Passthrough(clientStub, workerParameter);
      emitter = new EventEmitter();
      clientStub.submitJob.returns(emitter);
    });

    test('calls ejector if task succeeds', function() {
      p._runTask(sampleTask);
      emitter.emit('complete');

      expect(clientStub.submitJob).to.have.been.calledTwice;
      expect(clientStub.submitJob).to.have.been
        .calledWith('delayedJobDone', JSON.stringify(sampleTask));
    });
    test('does nothing if task fails', sinon.test(function() {
      p._runTask(sampleTask);
      emitter.emit('fail');

      expect(clientStub.submitJob).to.have.been.calledOnce;
    }));

    teardown(function() {
      sandbox.restore();
    });

  });
});
