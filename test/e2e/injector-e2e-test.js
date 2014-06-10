var gearman = require('gearman-coffee')
  , Injector = require('../../lib/daemon/injector').Injector
  , child_process = require('child_process')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , expect = chai.expect
  , sqlite = require('../../lib/adapters/sqlite')
  , fs = require('fs')
  , async = require('async')
  , spawn = require('../lib/spawn')
  , Client = require('gearman-coffee').Client;

chai.should();
chai.use(sinonChai);

suite('(e2e) injector', function() {

  suite('using a stubbed adapter that "works",', function() {

    this.timeout(5000);

    var gearmand;
    var adapter = {};
    var client;
    var e;
    var conf = { dbconn: adapter,
          servers: [{ host: 'localhost' }]
        };
    var port;
    var injector_in_use;

    var new_task = {
        controller: 'test',
        func_name: 'log',
        runner_retry_count: 2
    }

    var non_expiring_task1 = {
        id : 2,
        controller: 'test',
        func_name: 'log',
        runner_retry_count: 2
    }

    var expiring_task1 = {
        id : 2,
        controller: 'test',
        func_name: 'log',
        runner_retry_count: 1
    }

    var sample_task1 = {
        id: 666,
        controller: 'test',
        func_name: 'log',
        mikko: 'jussi',
        jeebo: 'jussi'
    }

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
          adapter.saveTask = sinon.stub().yields(null, 1);
          injector_in_use = new Injector(conf)
          .on('connect', function() {
            callback();
          });
        }
        ], function() {
          done();
        });
    });

    teardown(function(done) {
      async.series([
        function (callback) {
          client.on('disconnect', function() {
            callback();
          });
          client.disconnect();
        },
        function (callback) {
          injector_in_use.on('disconnect', function() {
            callback();
          });
          injector_in_use.disconnect(0, function(){});
        },
        function (callback) {
          spawn.killall([gearmand], callback);
        }
        ], function () {
          done();
      });
    });

    test('should call saveTask on adapter on new task', function(done) {
      client = new Client({port:port});
      client.submitJob('submitJobDelayed', JSON.stringify(new_task))
      .on('complete', function() {
        expect(adapter.saveTask).to.have.been.calledOnce;
        done();
      });
    });

    test('should call saveTask with the task to be saved', function(done){
      client = new Client({port:port});
      client.submitJob('submitJobDelayed', JSON.stringify(new_task))
      .on('complete', function(){
        expect(adapter.saveTask).to.have.been.calledWith(new_task);
        done();
      });
    });

  });

suite('using a stubbed adapter that "fails",', function(){
  this.timeout(5000);

  var gearmand;
  var adapter = {};
  var client;
  var e;
  var conf = { dbconn: adapter,
        servers: [{ host: 'localhost' }]
      };
  var port;
  var injector_in_use;

  var new_task = {
      controller: 'test',
      func_name: 'log',
      runner_retry_count: 2
  }

  var non_expiring_task1 = {
      id : 2,
      controller: 'test',
      func_name: 'log',
      runner_retry_count: 2
  }

  var expiring_task1 = {
      id : 2,
      controller: 'test',
      func_name: 'log',
      runner_retry_count: 1
  }

  var sample_task1 = {
      id: 666,
      controller: 'test',
      func_name: 'log',
      mikko: 'jussi',
      jeebo: 'jussi'
  }

  var adapter_error = {
    message : "not working on purpose"
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
        adapter.saveTask = sinon.stub().yields(adapter_error, null);
        injector_in_use = new Injector(conf)
        .on('connect', function() {
          callback();
        });
      }
      ], function() {
        done();
      });
  });

  teardown(function(done) {
    async.series([
      function (callback) {
        client.on('disconnect', function() {
          callback();
        });
        client.disconnect();
      },
      function (callback) {
        injector_in_use.disconnect(0, function(){});
        callback();
      },
      function (callback) {
        spawn.killall([gearmand], callback);
      }
      ], function () {
        done();
    });
  });

  test('should call saveTask on adapter on new task but pass error message in warning', function(done) {
      client = new Client({port:port});
      client.submitJob('submitJobDelayed', JSON.stringify(new_task))
      .on('warning', function(handle, error) {
        expect(error).to.equal(adapter_error.message);
      })
      .on('fail', function(handle, error) {
        expect(adapter.saveTask).to.have.been.calledOnce;
        done();
      });
    });

  test('should call saveTask and pass an error in warning event', function(done){
    client = new Client({port:port});
    client.submitJob('submitJobDelayed', JSON.stringify(new_task))
    .on('warning', function(handle, error){
      expect(error).to.equal(adapter_error.message);
    })
    .on('fail', function(handle, error){
      expect(adapter.saveTask).to.have.been.calledWith(new_task);
      done();
    });
  });
});

});