var events = require('events');
var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
chai.use(require('sinon-chai'));

var MultiserverWorker = require("../../lib/gearman/multiserver-worker").MultiserverWorker;
var gearman = require('gearman-node');

exports.Worker = events.EventEmitter;

var dummy_func = function() {};

suite("multiserver-worker", function() {
  var sandbox = sinon.sandbox.create();
  var WorkerSpy;
  suite("when given multiple servers", function() {
    var m, workerStub;

    var sampleServers = [{
      host:'localhost',
      port:2
    }, {
      host:'melkki',
      port:7155
    }];

    setup(function() {
      WorkerSpy = sandbox.spy(gearman, 'Worker');
      WorkerSpy.prototype.reconnecter = new events.EventEmitter();
      m = new MultiserverWorker(
        sampleServers,
        'sample',
        dummy_func);
    });

    teardown(function() {
      sandbox.restore();
    });

    test("should spawn as many worker instances", function() {
      expect(WorkerSpy).to.be.calledTwice;
      expect(WorkerSpy).to.be.calledWith('sample');
      expect(WorkerSpy.args[0][2].host).to.equal(sampleServers[0].host);
      expect(WorkerSpy.args[0][2].port).to.equal(sampleServers[0].port);
      expect(WorkerSpy).to.be.calledWith('sample');
      expect(WorkerSpy.args[1][2].host).to.equal(sampleServers[1].host);
      expect(WorkerSpy.args[1][2].port).to.equal(sampleServers[1].port);
    });
  });
  suite("when given no servers", function() {
    setup(function() {
      WorkerSpy = sandbox.spy(gearman, 'Worker');
      m = new MultiserverWorker(
        null,
        'sample',
        dummy_func);
    });
    teardown(function() {
      sandbox.restore();
    });

    test("should spawn a worker with default config", function() {
      expect(WorkerSpy).to.have.been.calledOnce;
    });
  });

  suite("disconnect()", function() {
    setup(function() {
      WorkerSpy = sandbox.spy(gearman, 'Worker');
      WorkerSpy.prototype.disconnect = sandbox.spy();
      WorkerSpy.prototype.reconnecter = new events.EventEmitter();
      m = new MultiserverWorker(
        null,
        'sample',
        dummy_func);
    });

    teardown(function() {
      sandbox.restore();
    });

    test("should call disconnect for all workers", function() {
      m.disconnect();
      m._connections.forEach(function(worker) {
        expect(worker.disconnect).to.have.been.calledOnce;
      });
    });
    test("should emit disconnect event", function(done) {
      this.timeout(500);
      m.on('disconnect', done);
      m._connected_count = m._connections.length;
      m.disconnect();
      m._connections.forEach(function(worker) {
        worker.reconnecter.emit('disconnect');
      });
    });
    test("should not set connected as false if workers did not disconnect", function() {
      m.connected = true;
      m.disconnect();
      expect(m.connected).to.be.true;
    });
  });
});
