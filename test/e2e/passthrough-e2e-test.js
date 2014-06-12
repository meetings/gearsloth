var gearman = require('gearman-coffee')
  , passthrough = require('../../lib/controllers/passthrough')
  , child_process = require('child_process')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , spawn = require('../lib/spawn')
  , async = require('async');

chai.should();
chai.use(sinonChai);

suite('(e2e) passthrough controller', function() {

  this.timeout(5000);

  var gearmand
    , port = 54730
    , adapter = {}
    , client
    , conf = {
      dbconn: adapter,
      servers: [{ 
        host: 'localhost',
        port:port
      }]
    }
    , task = {
      id: '666',
      func_name: 'ebinner',
      payload: 'motherload'
    }

  setup(function(done) {
    async.series([
      function(callback) {
        gearmand = spawn.gearmand(port, function(){
          callback();
        });
      },
      function(callback) {
        client = new gearman.Client({
          port: port
        });
        client.on('connect', function() {
          passthrough(conf);
          callback();
        });
      }
      ], function(){
        done();
      });
  });

  teardown(function(done) {
    async.series([
      function(callback) {
        client.socket.on('close', function() {
          callback();
        });
        client.disconnect();
      },
      function(callback) {
        spawn.killall([gearmand], function() {
          callback();
        });
      }
      ], function(){
        done();
      })
  });

  test('should call correct func_name with correct string payload', function(done) {
    var completeRunner = sinon.stub();

    var funcCallback = sinon.spy(function(payload, worker) {
      worker.complete();
      payload.toString().should.be.equal(task.payload);
    });

    var func = new gearman.Worker('ebinner', funcCallback, conf.servers[0]);

    var ejector = new gearman.Worker('delayedJobDone', function(ejector_task_raw) {
      var ejector_task = JSON.parse(ejector_task_raw.toString());
      ejector_task.id.should.equal(task.id);

      completeRunner.should.have.been.calledOnce;
      funcCallback.should.have.been.calledOnce;

      done();
    }, conf.servers[0]);

    client.submitJob('passthroughController', JSON.stringify(task))
      .on('complete', completeRunner);
  });

});
