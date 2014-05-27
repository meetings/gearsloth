var chai = require("chai");
var sinon = require('sinon');
var expect = chai.expect;
chai.use(require('sinon-chai'));

var Multiserver = require("../../lib/gearman-multiserver").Multiserver;

var worker = {
  Worker: function() {},
};

suite("gearman-multiserver", function() {
  suite("constructor", function() {
    test("should exist", function() {
      expect(new Multiserver('func_name', function() {}, {
        host:'murre',
        port:2
      })).to.be.ok;
    });
  });
  suite("when given multiple servers", function() {
    var sandbox = sinon.sandbox.create();
    var m, workerStub;

    var servers = [{
      host:'localhost',
      port:2
    }, {
      host:'melkki',
      port:715517
    }];

    setup(function() {
      workerStub = sandbox.stub(gearman);
      m = new Multiserver(
    }
    test("should spawn as many worker instances", function() {
      
      
    });
  });
});
