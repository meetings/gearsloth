var async = require('async');
var chai = require('chai');
var expect = chai.expect;
var ejector = require('../..lib/daemon/ejector').Ejector;
var Runner = require('../../lib/daemon/runner').Runner;
var Injector = require('../../lib/daemon/injector').Injector;
var gearman = require('gearman-coffee');
var spawn = require('../lib/spawn');
var child_process = require('child_process');

suite('blackbox: on-time with sqlite :memory:', function() {

  this.timeout(5000);

  var injector;
  var ejector;
  var runner;
  var client;
  var worker;

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

  };
  var after_1_task {

  };
  var after_3_task {

  };

  setup(function(done) {
    async.series([
      function(callback) {
        port = 6660 + Math.floor(Math.random() * 1000);
        conf.servers[0].port = port;
        callback();
      },
      function(callback) {
        gearmand = spawn.gearmand(port, function(){
          callback();
        });
      },
      function(callback) {
        runner = new Runner(conf);
        runner.on('connect', function(){
          callback();
        });
      },
      function(callback) {
        injector = new Injector(conf);
        injector.on('connect', function() {
          callback();
        });
      },
      function(callback) {
        ejector = new Ejector(conf);
        ejector.on('connect', function() {
          callback();
        });
      }
      ], function() {
        done();
      })
  });

  teardown(function(done)) {
    async.series([
      function(callback) {
        runner.on('disconnect', function() {
          callback();
        })
        runner.disconnect();
      },
      function(callback) {
        injector.on('disconnect', function() {
          callback();
        });
        injector.disconnect();
      },
      function(callback) {
        ejector.on('disconnect', function() {
          callback();
        });
        ejector.disconnect();
      },
      function(callback) {
        spawn.killall([gearmand], function() {
          callback();
        });
      }
      ], function() {
        done();
      });
  }

});
