var gearman = require('gearman-coffee');
var assert = require("assert");
var chai = require("chai");
var expect = chai.expect;
var gearsloth = require('../../lib/gearsloth');

// this test file assumes that a gearman server and a gearsloth worker are
// running

// default delay in milliseconds
var delay = 1000;

// dummy test function, this is changed inside asynchronous test cases
var testFunction = function() {};

// launch worker
var worker = new gearman.Worker('test', function(payload, worker) {
  testFunction(payload);
  return worker.complete();
});

// launch client
var client = new gearman.Client();

describe('gearsloth worker', function() {
  suite('submitJobDelayed()', function() {
    test('should not alter the payload', function(done) {
      var test_string = 'test string';
      testFunction = function(payload) {
        if (payload.toString('utf8') === test_string) {
          return done();
        }
        done(new Error('test string is not equal to the payload'));
      }
      client.submitJob('submitJobDelayed', gearsloth.encodeTask(
        new Date(Date.now() + delay).toISOString(), 'test', test_string
      ));
    });
  });
});
