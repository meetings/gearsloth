var crypto = require('crypto');
var async = require('async');
var chai = require('chai');
var spawn = require('../lib/spawn');
var Tester = require('../lib/tester').Tester;

// default gearman port
var port = 54730;

suite('single gearslothd in default mode:', function() {

  this.timeout(5000);

  var gearmand;
  var gearslothd;
  var tester;
  var conf = {
    verbose: 1,
    db: 'sqlite',
    dbopt: {
      poll_timeout: 0,
      db_file: ':memory:'
    },
    servers: [{
      host: 'localhost',
      port: port
    }]
  };

  setup(function(done) {
    async.series([
      function(callback) {
        gearmand = spawn.gearmand(port, callback);
      },
      function(callback) {
        gearslothd = spawn.gearslothd(conf, callback);
      },
      function(callback) {
        tester = new Tester(port, callback);
      }
    ], function() {
      done();
    });
  });

  teardown(function(done) {
    async.series([
      function(callback) {
        tester.disconnect(callback);
      },
      function(callback) {
        spawn.killall([gearslothd], callback);
      },
      function(callback) {
        spawn.killall([gearmand], callback);
      }
    ], function() {
      done();
    });
  });

  test('string payload should pass through gearman unchanged', function(done) {
    var test_string = 'qwer';
    tester.test(test_string, function(payload) {
      chai.expect(payload.toString()).to.equal(test_string);
      done();
    });
  });

  test('binary payload should pass through gearman unchanged', function(done) {
    var test_payload = new Buffer([0, 255]);
    tester.test(test_payload, function(payload) {
      chai.expect(payload.toString('base64')).to
        .equal(test_payload.toString('base64'));
      done();
    });
  });

  test('huge binary payload should pass through gearman unchanged',
      function(done) {
    var test_payload = crypto.pseudoRandomBytes(100000);
    tester.test(test_payload, function(payload) {
      if (payload.toString('base64') !== test_payload.toString('base64'))
        throw new Error('huge binary payloads differ');
      done();
    });
  });

  test('string payload should pass through gearslothd stack unchanged',
      function(done) {
    var test_string = 'qwer';
    tester.testDelayed({
      func_name: tester.test_func_name,
      payload: test_string
    }, function(payload) {
      chai.expect(payload.toString()).to.equal(test_string);
      done();
    });
  });

  test('binary payload should pass through gearslothd stack unchanged',
      function(done) {
    var test_payload = new Buffer([0, 255]);
    tester.testDelayed({
      func_name: tester.test_func_name,
      payload_base64: test_payload.toString('base64')
    }, function(payload) {
      chai.expect(payload.toString('base64')).to
        .equal(test_payload.toString('base64'));
      done();
    });
  });

  test('huge binary payload should pass through gearslothd stack unchanged',
      function(done) {
    var test_payload = crypto.pseudoRandomBytes(100000);
    tester.testDelayed({
      func_name: tester.test_func_name,
      payload_base64: test_payload.toString('base64')
    }, function(payload) {
      if (payload.toString('base64') !== test_payload.toString('base64'))
        throw new Error('huge binary payloads differ');
      done();
    });
  });

});
