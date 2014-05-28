var chai = require("chai");
var sinon = require('sinon');
var expect = chai.expect;
chai.use(require('sinon-chai'));

var MultiserverClient = require("../../lib/gearman/multiserver-client").MultiserverClient;
var Client = require("gearman-coffee").Client;


var dummy_func = function() {};

suite("multiserver-client", function() {
  var sandbox = sinon.sandbox.create();
  suite("when given multiple servers", function() {
    var m, ClientStub, randomStub, submitJobStub;

    var sampleServers = [{
      host:'localhost',
      port:2
    }, {
      host:'melkki',
      port:715517
    }];

    setup(function() {
      ClientStub = sandbox.spy(Client);
      ClientStub.prototype.submitJob = sandbox.spy(Client.prototype.submitJob);
      randomStub = sandbox.stub();
      m = new MultiserverClient(
        sampleServers,
        ClientStub,
        randomStub);
    });

    
    teardown(function() {
      sandbox.restore();
    });
    test("should spawn as many client instances", function() {
      expect(ClientStub).to.be.calledTwice; 
      expect(ClientStub).to.be
      .calledWith(sampleServers[0]);
      expect(ClientStub).to.be
      .calledWith(sampleServers[1]);
    });
    test("should have a submitJob() function with on() function", function() {
      expect(m).to.have.property('submitJob');
      randomStub.returns(0);
      expect(m.submitJob('test', 'test')).to.have.property('on');
    });
    // does not actually test anything
    test("should pick a server randomly", function() {
      randomStub.onCall(0).returns(0);
      randomStub.onCall(1).returns(0.9);
      var func1 = m.submitJob();
      var func2 = m.submitJob();
      expect(func1).to.not.equal(func2);
    });
    test("should call submitJob with correct arguments", function() {
      randomStub.returns(0);
      m.submitJob('kikkens', 'sinep');
      expect(ClientStub.prototype.submitJob).to.have.been.calledWith('kikkens', 'sinep');
    });
  });

  suite("when given no servers", function() {
    var ClientStub;
    setup(function() {
      ClientStub = sandbox.spy(Client);
      m = new MultiserverClient(
        null,
        ClientStub);
    });

    test("should return a client with default config", function() {
      expect(ClientStub).to.have.been.calledOnce;
      expect(m).to.have.property('submitJob');
    });
  });
});
