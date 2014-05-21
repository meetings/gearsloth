var chai = require("chai");
var sinon = require('sinon');
var gearman = require('gearman-coffee');
var Passthrough = require("../../lib/strategies/passthrough");

chai.should();

describe('passthrough strategy', function() {
  suite('construction', function() {
    test('can create Passthrough strategy', sinon.test(function() {
      this.stub(gearman);
      var p = new Passthrough(gearman);
      gearman.Worker.calledWithNew().should.be.true;
      gearman.Worker.calledOnce.should.be.true;
    }));
  });
});
