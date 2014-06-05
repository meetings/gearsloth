var events = require('events');
var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
chai.use(require('sinon-chai'));

var MultiserverWorker = require("../../lib/gearman/multiserver-worker").MultiserverWorker;

exports.Worker = events.EventEmitter;

var dummy_func = function() {};

suite("multiserver-worker", function() {
  var sandbox = sinon.sandbox.create();
  suite("when given multiple servers", function() {
    var m, workerStub, workerSpy;

    var sampleServers = [{
      host:'localhost',
      port:2
    }, {
      host:'melkki',
      port:7155
    }];

    setup(function() {
      sandbox.spy(exports, 'Worker');
      m = new MultiserverWorker(
        sampleServers,
        'sample',
        dummy_func,
        exports.Worker);
    });

    teardown(function() {
      sandbox.restore();
    });

    test("should spawn as many worker instances", function() {
      expect(exports.Worker).to.be.calledTwice;
      expect(exports.Worker).to.be
      .calledWith('sample', dummy_func, sampleServers[0]);
      expect(exports.Worker).to.be
      .calledWith('sample', dummy_func, sampleServers[1]);
    });
  });
  suite("when given no servers", function() {
    setup(function() {
      sandbox.spy(exports, 'Worker');
      m = new MultiserverWorker(
        null,
        'sample',
        dummy_func,
        exports.Worker);
    });

    test("should spawn a worker with default config", function() {
      expect(exports.Worker).to.have.been.calledOnce;
    });
  });

  suite("disconnect()", function() {
    setup(function() {
      sandbox.spy(exports, 'Worker');
      exports.Worker.prototype.disconnect = sandbox.spy();
      m = new MultiserverWorker(
        null,
        'sample',
        dummy_func,
        exports.Worker);
    });

    test("should call disconnect for all workers", function() {
      m._workers.forEach(function(worker) {
        expect(worker.disconnect).to.have.been.calledOnce;
      });
    });
  });
});
