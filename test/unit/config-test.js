var config = require('../../config');
var log = require('../../lib/log');
var chai = require('chai');
var expect = chai.expect;

describe('config', function() {
  suite('initialize()', function() {
    test('should show error message on nonexistent conf', function() {
      log.setOutput({
        error: function(text) {
          expect(text).to.contain('does not exist');
        }
      });
      config.initialize(['-c', 'nonexistent'], log, function() {});
      log.setOutput(require('util'));
    });
  });
});
