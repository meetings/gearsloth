var chai = require("chai");
var adapter = require('../../lib/adapters/sqlite');

var expect = chai.expect;

describe('sqlite-adapter', function() {
  var second_ago = new Date() - 1000;

  var func_name = 'log';
  var payload = new Buffer(10);
  var test_json = {
    at: second_ago,
    func_name: func_name,
    payload: payload
  };

  setup(function() {
  });

  suite('saveTask() and readNextTasks()', function() {
    test('should insert JSON task into database', function(done) {
      adapter.initialize(null, testScript);

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          stop();

          try {
            expect(task).to.have.property('at');
            expect(task).to.have.property('func_name');
            expect(task).to.have.property('payload');
          } catch(err) {
            return done(err);
          }
          done();

        });

        dbconn.saveTask(test_json, function() {});
      }
    });

    test('should insert task parameters into database', function(done) {
      adapter.initialize(null, testScript);

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          stop();

          try {
            expect(task).to.have.property('at');
            expect(task).to.have.property('func_name');
            expect(task).to.have.property('payload');
          } catch(err) {
            return done(err);
          }
          done();

        });

        dbconn.saveTask(second_ago, func_name, payload, function() {});
      }
    });

    test('should give unique ids to tasks', function(done) {
      adapter.initialize(null, testScript);

      var items = 3;

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          --items;
          stop();

          try {
            expect(task).to.have.property('at');
            expect(task).to.have.property('func_name');
            expect(task).to.have.property('payload');
          } catch(err) {
            return done(err);
          }

          if (items <= 0) done();

        });

        dbconn.saveTask(test_json, function() {});
        dbconn.saveTask(test_json, function() {});
        dbconn.saveTask(test_json, function() {});
      }
    });

    test('should give unique ids to tasks', function(done) {
      adapter.initialize(null, testScript);

      var id = -1;

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          stop();

          try {
            expect(id).to.not.equal(task.id);
          } catch(err) {
            return done(err);
          }

          if(id != -1)
            done();
          id = task.id;

        });

        dbconn.saveTask(test_json, function() {});
        dbconn.saveTask(test_json, function() {});
      }
    });
  });
});
