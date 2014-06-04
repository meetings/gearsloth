var chai = require("chai");
var expect = chai.expect;
var sinon = require('sinon');
chai.use(require('sinon-chai'));
require('../../lib/log').setOutput();

var EventEmitter = require('events').EventEmitter;

var adapter = {
  completeTask: function() {}
};
var worker = {
  error: function() {},
  complete: function() {}
}

var Ejector = require("../../lib/daemon/ejector").Ejector;

suite('Ejector', function() {
  var sampleTask = {
    id: '2014',
    at: 'jussi',
    func_name: 'ryybs',
    payload: 'keissi'
  };
  var sampleBuffer = new Buffer(JSON.stringify(sampleTask));
  var sandbox = sinon.sandbox.create();
  var e, workerStub, adapterStub, workHandler;

  setup(function() {
    workerStub = sandbox.stub(worker);
    adapterStub = sandbox.stub(adapter);
    e = new Ejector({
      dbconn: adapterStub,
    });
  });

  teardown(function() {
    sandbox.restore();
  });

  suite('constructor', function() {
    test('can create Ejector', function() {
      var e = new Ejector(function(a) {return null;}, null);
    });
  });
  suite('initialize()', function() {
    test('exists', function() {
      expect(require("../../lib/daemon/ejector"))
      .to.be.ok;
    });
  });

  suite('workHandler()', function() {
    test('should call adapter\'s completeTask with whole task', function() {
      e.eject.call(e, sampleTask, workerStub);

      expect(adapterStub.completeTask).to.have.been.calledOnce;
      expect(adapterStub.completeTask).to.have.been
      .calledWith(sampleTask);
    });
    test('should call worker.complete() if successful', function() {
      adapterStub.completeTask.yields();
      e.eject.call(e, sampleTask, workerStub);

      expect(workerStub.complete).to.have.been.calledOnce;
    });
    test('should call worker.error() with error on failure', function() {
      var db_error = new Error('Error: vagina not accessible');
      adapterStub.completeTask.yields(db_error);
      e.eject.call(e, sampleTask, workerStub);

      expect(workerStub.error).to.have.been.calledOnce;
      expect(workerStub.error).to.have.been
      .calledWith(db_error.message);
    });

  });
});

