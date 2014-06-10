var async = require('async');
var chai = require('chai');
var expect = chai.expect;
var Ejector = require('../../lib/daemon/ejector').Ejector;
var Runner = require('../../lib/daemon/runner').Runner;
var Injector = require('../../lib/daemon/injector').Injector;
var gearman = require('gearman-coffee');
var spawn = require('../lib/spawn');
var child_process = require('child_process');
var sqlite = require('../../lib/adapters/sqlite');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var Passthrough = require('../../lib/controllers/passthrough').Passthrough;

chai.should();
chai.use(sinonChai);

suite.only('blackbox: on-time with sqlite :memory:', function() {

  this.timeout(5000);

  var gearmand;
  var injector;
  var ejector;
  var runner;
  var client;
  var worker;
  var controller;

  var port;
  var conf = {
    dbopt: {
      poll_timeout:0,
      db_name:':memory:'
    },
    servers: [{
      host:'localhost'
    }]
  };

  var simple_task = {
    func_name:'test',
    payload:'blackbox'
  };
  var after_1_task = {

  };
  var after_3_task = {

  };

  setup(function(done) {
    async.series([
      function(callback) {
        sqlite.initialize(conf, function(err, dbconn) {
            if (err) {
              console.log(err, dbconn);
              done("Error initializing database");
            }
            conf.dbconn = dbconn;
        console.log('db up');
            callback();
        });
      },
      function(callback) {
        port = 6660 + Math.floor(Math.random() * 1000);
        conf.servers[0].port = port;
        console.log('port up');
        callback();
      },
      function(callback) {
        gearmand = spawn.gearmand(port, function(){
        console.log('gearman up');
          callback();
        });
      },
      function(callback) {
        runner = new Runner(conf);
        runner.on('connect', function(){
        console.log('runner up');
          callback();
        });
      },
      function(callback) {
        injector = new Injector(conf);
        injector.on('connect', function() {
        console.log('injector up');
          callback();
        });
      },
      function(callback) {
        ejector = new Ejector(conf);
        ejector.on('connect', function() {
        console.log('ejector up');
          callback();
        });
      },
      function(callback) {
        controller = new Passthrough(conf);
        controller.on('connect', function(){
          console.log('controller up');
          callback();
        });
      }
      ], function() {
        done();
      })
  });

  teardown(function(done) {
    async.series([
      function(callback) {
        runner.on('disconnect', function() {
        console.log('runner down');
          callback();
        })
        runner.stop();
      },
      function(callback) {
        injector.on('disconnect', function() {
        console.log('injector down');
          callback();
        });
        injector.disconnect();
      },
      function(callback) {
        ejector.on('disconnect', function() {
        console.log('ejector down');
          callback();
        });
        ejector.disconnect();
      },
      function(callback) {
        controller.on('disconnect', function() {
          console.log('controller down');
          callback();
        });
        controller.disconnect();
      },
      function(callback) {
        client.on('disconnect', function() {
          console.log('client down');
          callback();
        });
        client.disconnect();
      },
      function(callback) {
        worker.socket.on('disconnect', function() {
          console.log('worker down');
          callback();
        });
        worker.disconnect();
      },
      function(callback) {
        spawn.killall([gearmand], function() {
        console.log('gearman down');
          callback();
        });
      }
      ], function() {
        done();
      });
  });

  test('task is recieved in bottom level worker almost immediately', function(done){
    client = new gearman.Client({port:port});
    worker = new gearman.Worker('test', function(payload, worker) {
      console.log(payload.toString());
      done();
    });
    worker.on('connect', function(){
      client.submitJob('submitJobDelayed', JSON.stringify(simple_task));
    });
  });

});
