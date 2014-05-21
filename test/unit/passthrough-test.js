var chai = require("chai");
var Passthrough = require("../../lib/strategies/passthrough");

var expect = chai.expect;

describe('passthrough strategy', function() {
  suite('construction', function() {
    test('can create Passthrough strategy', function() {
      var p = new Passthrough();
    });
  });
});