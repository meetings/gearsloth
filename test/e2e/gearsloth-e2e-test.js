var gearman = require('gearman-coffee');
var assert = require("assert");
var chai = require("chai");
var expect = chai.expect;
var gearsloth = require('../../lib/gearsloth');

// this test file assumes that a gearman server and a gearsloth worker are
// running

// default delay in milliseconds
var delay = 500;

// default tolerance in milliseconds
var tolerance = 500;

// dummy test function, this is changed inside asynchronous test cases
var testFunction = function() {};

// launch worker
var worker = new gearman.Worker('test', function(payload, worker) {
  testFunction(payload);
  return worker.complete();
});

// launch client
var client = new gearman.Client();

function getDelay() {
  return new Date(Date.now() + delay).toISOString();
}

describe('gearsloth worker', function() {

  // common stuff
  var test_string = 'test string';
  function setTestFunction(done) {
    testFunction = function(payload) {
      if (payload.toString('utf8') === test_string) {
        return done();
      };
      done(new Error('test string is not equal to the payload'));
    }
  }

  function setToleranceTestFunction(done) {
    var created = new Date();
    testFunction = function(payload) {
      var call_delay = new Date() - created;
      if (call_delay < delay)
        return done(new Error('test function was called too early (' +
          call_delay + 'ms < ' + delay + 'ms)'));
      if (call_delay > delay + tolerance)
        return done(new Error('test function was called too late (' +
          call_delay + 'ms > ' + (delay + tolerance) + 'ms)'));
      done();
    }
  }

  suite('submitJobDelayed()', function() {
    test('should not alter the payload', function(done) {
      setTestFunction(done);
      client.submitJob('submitJobDelayed', gearsloth.encodeTask(
        getDelay(), 'test', test_string
      ));
    });
    test('should execute at the specified time within tolerance',
      function(done) {
      setToleranceTestFunction(done);
      client.submitJob('submitJobDelayed', gearsloth.encodeTask(
        getDelay(), 'test', test_string
      ));
    });
  });
  suite('submitJobDelayedJson()', function() {
    test('should not alter the payload', function(done) {
      setTestFunction(done);
      client.submitJob('submitJobDelayedJson', JSON.stringify({
        at: getDelay(),
        func_name: 'test',
        payload: test_string
      }));
    });
    test('should execute at the specified time within tolerance',
      function(done) {
      setTestFunction(done);
      client.submitJob('submitJobDelayedJson', JSON.stringify({
        at: getDelay(),
        func_name: 'test',
        payload: test_string
      }));
    });
  });
});
