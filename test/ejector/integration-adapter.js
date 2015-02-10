var lib = require('../../lib/helpers/lib_require');

var util = require('util');
var _ = require('underscore');
var async = require('async');
var gearman = require('gearman-node');
var log = lib.require('log').mute();

var spawn = lib.require('test-helpers/spawn');
var adapter_helper = lib.require('test-helpers/adapter-helper');
var client_helper = lib.require('test-helpers/client-helper');
var Ejector = lib.require('daemon/ejector').Ejector;

var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;

chai.should();
chai.use(sinonChai);

suite('(e2e) ejector', function() {

  suite('using a real adapter', function() {

    this.timeout(5000);

    var port = 54730;
    var ejector;

    var conf =  {
      db : adapter_helper.return_current_adapter_module(),
      dbopt: adapter_helper.return_normal_dbopt(),
      servers: [ { host : 'localhost', port : port } ]
    };

    setup(function(done) {
      async.series([
        adapter_helper.async_teardown(conf),
        spawn.async_gearmand(port),
        function(callback) {
          ejector = new Ejector(conf);
          ejector.on('connect', function() {
            callback();
          });
        },
      ], done);
    });

    teardown(function(done) {
      async.series([
        ejector.disconnect.bind(ejector),
        client_helper.teardown,
        spawn.teardown,
        adapter_helper.async_teardown(conf)
      ], done);
    });

    test('should remove inserted job', function(done) {
      var task = { func_name : 'test' };

      async.waterfall([
        adapter_helper.async_inject_job_and_wait_for_completion(ejector._dbconn, task),
        adapter_helper.async_gather_enabled_job_meta_list(ejector._dbconn),
        function(meta_jobs, callback) {
          expect(meta_jobs).to.have.length(1);
          var meta_job = meta_jobs[0];
          expect(meta_job.job).to.have.property('func_name', task.func_name);
          callback(null, 'gearsloth_eject-' + meta_job.domain, meta_job.job, port);
        },
        client_helper.submit_func_with_json_payload_to_port_and_wait_for_completion,
        adapter_helper.async_gather_enabled_job_list(ejector._dbconn),
        function(jobs, callback) {
          expect(jobs).to.have.length(0);
          callback();
        }
      ], done)
    });
  });
});
