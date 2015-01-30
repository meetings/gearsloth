var lib = require('../../lib/helpers/lib_require');

var _ = require('underscore');
var async = require('async');
var gearman = require('gearman-coffee');
var log = lib.require('log').mute();

var spawn = lib.require('test-helpers/spawn');
var adapter_helper = lib.require('test-helpers/adapter-helper');
var worker_helper = lib.require('test-helpers/worker-helper');
var Runner = lib.require('daemon/runner').Runner;

var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;

chai.should();
chai.use(sinonChai);

// Depends on _dbconn and _default_controller being present in a runner object

suite('(e2e) runner', function() {

  suite('using a real adapter', function() {

    this.timeout(3000);

    var port = 54730;
    var running_runner;

    var conf = {
      db: adapter_helper.return_current_adapter_module(),
      dbopt: adapter_helper.return_normal_dbopt(),
      servers: [ { host: 'localhost', port: port }]
    };

    setup(function(done) {
      async.series([
        adapter_helper.async_teardown(conf),
        spawn.async_gearmand(port),
        function(callback) {
          running_runner = new Runner(conf);
          running_runner.on('connect', function(){
            callback();
          });
        }
      ], done);
    });

    teardown(function(done) {
      async.series([
        worker_helper.teardown,
        running_runner.disconnect.bind(running_runner),
        spawn.teardown,
        adapter_helper.async_teardown(conf)
      ], done);
    });

    test('should fetch a due task from db and pass it on to default controller with id and eject_function', function(done) {
      var task = {
        func_name: 'default-controller-test'
      };

      worker_helper.register_worker_to_port_with_json_payload(running_runner._default_controller, port, function(data) {
        expect(data).to.have.property('id');
        expect(data).to.have.property('eject_function');
        expect(data).to.have.property('func_name', task.func_name);
        done();
      });

      adapter_helper.inject_job(running_runner._dbconn, task);
    });

    test('should fetch a due task from db and pass it on to custom controller', function(done) {
      var task = {
        func_name: 'custom-controller-test',
        controller: 'test-controller',
      };

      worker_helper.register_worker_to_port_with_json_payload('test-controller', port, function(data) {
        expect(data).to.have.property('id');
        expect(data).to.have.property('func_name', task.func_name);
        done();
      });

      adapter_helper.inject_job(running_runner._dbconn, task);
    });

    test('should fetch a future task from db only after specified time', function(done) {
      // NOTE toString() automatically rounds down to last second so put no less than 2000 ms here.
      var at = new Date(new Date().getTime() + 2000).toString();
      var task = {
        func_name: 'delayed-run-test',
        at: at,
      };

      worker_helper.register_worker_to_port_with_json_payload(running_runner._default_controller, port, function(data) {
        expect(data).to.have.property('func_name', task.func_name);
        expect(new Date().getTime()).to.be.within(new Date(at).getTime(), new Date(at).getTime() + 2000);
        done();
      });

      adapter_helper.inject_job(running_runner._dbconn, task);
    });

    test('should disable task before sending if runner_retry_count is 0', function(done) {
      var task = {
        func_name: 'retry-count-disable-test',
        runner_retry_count: 0,
      };

      worker_helper.register_worker_to_port_with_json_payload(running_runner._default_controller, port, function(data) {
        expect(data).to.have.property('func_name', task.func_name);
        adapter_helper.gather_enabled_job_list(running_runner._dbconn, function(error, jobs) {
          expect(jobs).to.have.length(0);
          done();
        });
      });

      adapter_helper.inject_job(running_runner._dbconn, task);
    });

    test('should decrease runner_retry_count before sending if it is more than 0', function(done) {
      var task = {
        func_name: 'retry-count-decrease-test',
        runner_retry_count: 1,
      };

      worker_helper.register_worker_to_port_with_json_payload(running_runner._default_controller, port, function(data) {
        expect(data).to.have.property('func_name', task.func_name);
        expect(data).to.have.property('runner_retry_count');
        expect(parseInt(data.runner_retry_count)).to.equal(0);
        done();
      });

      adapter_helper.inject_job(running_runner._dbconn, task);
    });

    test('should pass arbitrary extra params to controller', function(done) {
      var task = {
        func_name: 'default-controller-test',
        random_parameter: 'random_value',
      };

      worker_helper.register_worker_to_port_with_json_payload(running_runner._default_controller, port, function(data) {
        expect(data).to.have.property('func_name', task.func_name);
        expect(data).to.have.property('random_parameter', task.random_parameter);
        done();
      });

      adapter_helper.inject_job(running_runner._dbconn, task);
    });
  });
});
