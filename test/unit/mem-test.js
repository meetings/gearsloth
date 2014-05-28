var chai = require('chai');
var sinon = require('sinon');
var memadapter = require('../../lib/adapters/mem');
var MemAdapter = memadapter.MemAdapter;

chai.should();
var expect = chai.expect;

suite('MemAdapter', function() {

  var adapter;

  setup(function() {
    adapter = new MemAdapter();
  });

  suite('construct', function() {
    test('can construct MemAdapter', function() {
      var adapter = new MemAdapter();
    });
  });
  suite('saveTask', function() {
    test('sends task to listener', function() {
      var task = "some task";
      var callback = sinon.spy();
      adapter.listenTask(callback);
      adapter.saveTask(task, function() {});

      callback.calledOnce.should.be.true;
      callback.calledWith(null, task).should.be.true;
    });
    test('calls provided callback', function(done) {
      var task = "some task";
      adapter.listenTask(function() {});
      adapter.saveTask(task, function() {
        done();
      });
    });
  });
  suite('listenTask', function() {
    test('adds task listener', function() {
      var callback = sinon.stub();
      adapter.listenTask(callback);
      adapter._listener.should.equal(callback);
    });
    test('throws error if trying to add listener again', function() {
      var callback = sinon.stub();
      adapter.listenTask(callback);
      expect(function() {
        adapter.listenTask(callback);
      }).to.throw(Error);
    });
    test('removing listener works', function() {
      var callback = sinon.stub();
      var remover = adapter.listenTask(callback);
      remover();
      expect(adapter._listener).to.be.null;
    });
  });
  suite('initialize', function() {
    test('returns a MemAdapter', function() {
      var config = { injector: true, runner: true, ejector: true };
      var callback = sinon.spy();
      memadapter.initialize(config, callback);

      callback.calledOnce.should.be.true;
      callback.firstCall.args[1].should.be.an('object');
    });
    test('should error if not both worker and runner', function() {
      var config = { worker: true, runner: false };
      expect(function() {
        memadapter.initialize(config, null);
      }).to.throw(Error);
    });
  });

});
