var chai = require("chai");
var sinon = require('sinon');
var expect = chai.expect;
chai.use(require('sinon-chai'));
var EventEmitter = require('events').EventEmitter;


var MultiserverClient = require("../../lib/gearman/multiserver-client").MultiserverClient;
var Client = require("gearman-coffee").Client;


var dummy_func = function() {};

suite("multiserver-client", function() {
    var sampleServers = [{
      host:'localhost',
      port:2
    }, {
      host:'localhost',
      port:715517
    }, {
      host:'localhost',
      port:715517
    }];
  var sandbox = sinon.sandbox.create();
  suite("when given multiple servers", function() {
    var m, ClientStub, randomStub, submitJobStub;


    setup(function() {
      ClientStub = sandbox.spy(Client);
      ClientStub.prototype.submitJob = sandbox.stub();
      ClientStub.prototype.submitJob.returns({on:function() {}});
      ClientStub.prototype.connected = true;;
      
      m = new MultiserverClient(
        sampleServers,
        ClientStub);
    });

    teardown(function() {
      sandbox.restore();
    });

    test("should spawn as many client instances", function() {
      expect(ClientStub).to.be.calledThrice;
      expect(ClientStub).to.be
      .calledWith(sampleServers[0]);
      expect(ClientStub).to.be
      .calledWith(sampleServers[1]);
      expect(ClientStub).to.be
      .calledWith(sampleServers[1]);
    });
    test("should have a submitJob() function", function() {
      expect(m).to.have.property('submitJob');
    });
    test("should have a submitJobBg() function", function() {
      expect(m).to.have.property('submitJobBg');
    });
    test("should call submitJob with correct arguments", function() {
      m.connected = true;
      m.submitJob('kikkens', 'sinep');
      expect(ClientStub.prototype.submitJob).to.have.been.calledWith('kikkens', 'sinep');
    });
  });
  suite("when all but one server are down", function() {
    setup(function() {
      ClientStub = sandbox.spy(Client);

      m = new MultiserverClient(
        sampleServers,
        ClientStub);

      m.connected = true;
      m._clients.forEach(function(client) {
        client.submitJob = sandbox.spy();
      });
      m._clients[sampleServers.length-1].connected = true;
    });
    teardown(function() {
      sandbox.restore();
    })

    test("submits to that server", function() {
      m.submitJob('mita', 'hessu');
      expect(m._clients[0].submitJob)
      .to.not.have.been.called;
      expect(m._clients[1].submitJob)
      .to.not.have.been.called;
      expect(m._clients[sampleServers.length-1].submitJob)
      .to.have.been.calledOnce;
    });
  });

  suite("when all servers are down", function() {
    setup(function() {
      ClientStub = sandbox.spy(Client);

      m = new MultiserverClient(
        sampleServers,
        ClientStub);

      m._clients.forEach(function(client) {
        client.submitJob = sandbox.spy();
      });

    });
    teardown(function() {
      sandbox.restore();
    })

    test("submitJob() throws an error", function() {
      expect(function() {
        m.submitJob('mita', 'hessu');
      }).to.throw(Error);
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
  
  suite("when disconnect is called", function() {
    setup(function() {
      ClientStub = sandbox.spy(Client);
      ClientStub.prototype.connected = true;
      ClientStub.prototype.reconnecter = new EventEmitter();


      m = new MultiserverClient(
        sampleServers,
        ClientStub);
      client = new EventEmitter();

      m._clients.forEach(function(client) {
        client.disconnect = sandbox.spy();
      });
    });

    teardown(function() {
      sandbox.restore();
    });

    test("should call disconnect for all clients", function() {
      m.disconnect();
      m._clients.forEach(function(client) {
        expect(client.disconnect).to.have.been.calledOnce;
      });
    });
    test("should emit disconnect event", function(done) {
        this.timeout(500);
        m.on('disconnect', done);
        m._connected_count = m._clients.length;
        m.disconnect();
        m._clients.forEach(function(client) {
          client.reconnecter.emit('disconnect');
        });
    });
    test("should not set connected as false if clients did not disconnect", function() {
        m.connected = true;
        m.disconnect();
        expect(m.connected).to.be.true;
    });
  });
});
