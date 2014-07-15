var events = require('events');
var crypto = require('crypto');
var util = require('util');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var multiserver = require('../../lib/gearman');
var Retry = require('../../lib/controllers/retry').Retry;

var assert = chai.assert;
var expect = chai.expect;

chai.should();
chai.use(sinonChai);

// This test suite depends on internal variables _client and _worker

suite('retry controller', function() {

  var sandbox = sinon.sandbox.create();

  setup(function() {
    sandbox.useFakeTimers();
    sandbox.stub(multiserver, 'MultiserverClient', MultiserverStub);
    sandbox.stub(multiserver, 'MultiserverWorker', MultiserverStub);
  });

  teardown(function() {
    sandbox.restore();
  });

  suite('constructor', function() {
    test('should create client and worker with correct arguments',
        function() {
      var retry = new Retry(default_conf);
      multiserver.MultiserverClient.should.have.been.calledWithNew;
      multiserver.MultiserverWorker.should.have.been.calledWithNew;
      multiserver.MultiserverClient.should.have.been.calledOnce;
      multiserver.MultiserverWorker.should.have.been.calledOnce;
      multiserver.MultiserverClient.should.have.been
          .calledWith(default_conf.servers);
      multiserver.MultiserverWorker.should.have.been
          .calledWith(default_conf.servers, 'retryController');
    });
    test(
        'should emit connect event when both client and worker are connected',
        function() {
      var spy = sinon.spy();
      var retry = new Retry(default_conf);
      retry.on('connect', spy);
      retry._client.connect();
      retry._worker.connect();
      spy.should.have.been.calledOnce;
    });
    test(
        'should not emit connect event when neither client nor worker are ' +
        'connected',
        function() {
      var spy = sinon.spy();
      var retry = new Retry(default_conf);
      retry.on('connect', spy);
      expect(spy).to.have.been
      sinon.assert.notCalled(spy);
      spy.should.not.have.been.called;
    });
    test(
        'should not emit connect event when only client is connected',
        function() {
      var spy = sinon.spy();
      var retry = new Retry(default_conf);
      retry.on('connect', spy);
      retry._client.connect();
      spy.should.not.have.been.called;
    });
    test(
        'should not emit connect event when only worker is connected',
        function() {
      var spy = sinon.spy();
      var retry = new Retry(default_conf);
      retry.on('connect', spy);
      retry._worker.connect();
      spy.should.not.have.been.called;
    });
  });
  suite('send task', function() {
    test('should complete worker', function() {
      var retry = new Retry(default_conf);
      retry._worker.connect();
      var workerStub = retry._worker.createTask({ id: 1 });
      workerStub.complete.should.have.been.calledOnce;
    });
    test('should submit job with provided func_name', function() {
      var task = {
        id: 1,
        func_name: 'asdf'
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.submitJob.should.have.been.calledOnce;
      retry._client.submitJob.should.have.been.calledWith(task.func_name);
    });
    test('should submit job with provided string payload', function() {
      var task = {
        id: 1,
        func_name: 'asdf',
        payload: 'qwer'
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.submitJob.should.have.been.calledOnce;
      retry._client.submitJob.should.have.been
          .calledWith(task.func_name, task.payload);
    });
    test('should submit job with provided object payload', function() {
      var task = {
        id: 1,
        func_name: 'asdf',
        payload: { qwer : 'qwer' }
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.submitJob.should.have.been.calledOnce;
      retry._client.submitJob.should.have.been
          .calledWith(task.func_name, JSON.stringify( task.payload ) );
    });
    test('should submit job with provided binary func_name', function() {
      var task = {
        id: 1,
        func_name_base64: new Buffer([0, 255]).toString('base64'),
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.submitJob.should.have.been.calledOnce;
      assert.equal(retry._client.submitJob.args[0][0].toString('base64'),
          task.func_name_base64);
    });
    test('should submit job with provided binary func_name', function() {
      var task = {
        id: 1,
        func_name_base64: new Buffer([0, 255]).toString('base64'),
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.submitJob.should.have.been.calledOnce;
      assert.equal(retry._client.submitJob.args[0][0].toString('base64'),
          task.func_name_base64);
    });
    test('should submit job with provided binary payload', function() {
      var task = {
        id: 1,
        func_name_base64: new Buffer([0, 255]).toString('base64'),
        payload_base64: new Buffer([0, 254]).toString('base64')
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.submitJob.should.have.been.calledOnce;
      assert.equal(retry._client.submitJob.args[0][0].toString('base64'),
          task.func_name_base64);
      assert.equal(retry._client.submitJob.args[0][1].toString('base64'),
          task.payload_base64);
    });
    test('should submit job with provided huge binary payload', function() {
      var task = {
        id: 1,
        func_name: 'zxcv',
        payload_base64: crypto.pseudoRandomBytes(100000).toString('base64')
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.submitJob.should.have.been.calledOnce;
      assert.equal(retry._client.submitJob.args[0][1].toString('base64'),
          task.payload_base64);
    });
    test('should not retry after completed call', function() {
      var task = {
        id: 1,
        func_name: 'zxcv',
        payload: 'qwer'
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.completeJob();
      retry._client.submitJob.should.have.been.calledOnce;
      retry._client.submitJob.should.have.been
          .calledWith(task.func_name, task.payload);
    });
    test('should retry after failed call if retry_count > 0', function() {
      var task = {
        id: 1,
        func_name: 'zxcv',
        payload: 'qwer',
        retry_count : 1
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.failJob();
      retry._client.submitJob.should.have.been.calledTwice;
    });
   test('should retry after failed call given number of times', function() {
      var task = {
        id: 1,
        func_name: 'qwer',
        retry_count: 2
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.failJob();
      retry._client.failJob();
      retry._client.submitJob.should.have.been.calledThrice;
      retry._client.failJob();
      retry._client.submitJob.should.have.been.calledThrice;
    });
    test('should submit gearsloth_eject-test background job with task id ' +
        'after completed call',
        function() {
      var task = {
        id: { db_id: 'asdf', task_id: 1 },
        eject_function: 'gearsloth_eject-test',
        func_name: 'zxcv',
        payload: 'qwer'
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.completeJob();
      retry._client.submitJobBg.should.have.been.calledOnce;
      retry._client.submitJobBg.should.have.been
          .calledWith('gearsloth_eject-test');
      assert.deepEqual(JSON.parse(retry._client.submitJobBg.args[0][1]).id,
          task.id);
    });
    test('should not submit gearsloth_eject-test background job with task id ' +
        'after failed call',
        function() {
      var task = {
        id: { db_id: 'asdf', task_id: 1 },
        eject_function: 'gearsloth_eject-test',
        func_name: 'zxcv',
        payload: 'qwer'
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.failJob();
      retry._client.submitJobBg.should.not.have.been.calledOnce;
    });
    test('should call ejector only once', function() {
      var task = {
        id: 1,
        eject_function: 'gearsloth_eject-test',
        func_name: 'qwer',
        retry_count: 3,
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._client.failJob();
      retry._client.completeJob();
      retry._client.submitJob.should.have.been.calledTwice;
      retry._client.submitJob.should.always.have.been
          .calledWith(task.func_name);
      retry._client.submitJobBg.should.have.been.calledOnce;
      retry._client.submitJobBg.should.have.been
          .calledWith('gearsloth_eject-test');
      assert.deepEqual(
          JSON.parse(retry._client.submitJobBg.args[0][1]).id, task.id);
    });
    test('should handle two tasks independently', function() {
      var task = {
        id: 1,
        eject_function: 'gearsloth_eject-test',
        func_name: 'qwer',
        retry_count: 3,
      };
      var retry = createRetryAndSendTask(default_conf, task);
      retry._worker.createTask(task);
      retry._client.completeJob();
      retry._client.failJob();
      retry._client.completeJob();
      retry._client.submitJob.should.have.been.calledThrice;
      retry._client.submitJob.should.always.have.been
          .calledWith(task.func_name);
      retry._client.submitJobBg.should.have.been.calledTwice;
      retry._client.submitJobBg.should.always.have.been
          .calledWith('gearsloth_eject-test');
      assert.deepEqual(
          JSON.parse(retry._client.submitJobBg.args[0][1]).id, task.id);
      assert.deepEqual(
          JSON.parse(retry._client.submitJobBg.args[1][1]).id, task.id);
    });
  });
});

// helpers

function createRetryAndSendTask(conf, task) {
  var retry = new Retry(conf);
  retry._worker.connect();
  retry._client.connect();
  retry._worker.createTask(task);
  return retry;
}

var default_conf = {
  servers: [{ host: 'localhost', port: 4730 }],
  adapter: { getDomains: function( callback ) { callback( [ 'test' ] ) } },
};

function MultiserverStub(servers, func_name, handler) {
  events.EventEmitter.call(this);
  this.connected = false;
  this.servers = servers;
  this.func_name = func_name;
  this.handler = sinon.spy(handler);
  this.jobQueue = [];
  this.submitJob = sinon.spy(MultiserverStub.prototype.submitJob.bind(this));
  this.submitJobBg = sinon.spy();
}

util.inherits(MultiserverStub, events.EventEmitter);

MultiserverStub.prototype.connect = function() {
  this.connected = true;
  this.emit('connect');
};

MultiserverStub.prototype.createTask = function(task) {
  var workerStub = {
    complete: sinon.spy()
  };
  this.handler(JSON.stringify(task), workerStub);
  return workerStub;
};

MultiserverStub.prototype.submitJob = function(func_name, payload) {
  var job = new events.EventEmitter();
  this.jobQueue.push(job);
  return job;
};

MultiserverStub.prototype.removeJob = function(index) {
  index = index || 0;
  return this.jobQueue.splice(index, 1)[0];
};

MultiserverStub.prototype.completeJob = function(index) {
  return this.removeJob(index).emit('complete');
};

MultiserverStub.prototype.failJob = function(index) {
  return this.removeJob(index).emit('fail');
};
