var chai = require("chai");
var adapter = require('../../lib/adapters/sqlite');
var sqlite3 = require('sqlite3').verbose();

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
  var testdb;
  var conn;
  setup(function() {
    adapter.initialize();
  });
  suite('saveTask() and readNextTasks()', function() {
    test('should insert JSON task into database', function() {
      adapter.saveTask(test_json);
      adapter.readNextTasks(function(task) {
        expect(task).to.have.property('id', 'at', 'func_name', 'payload');
      });
    });
    test('should insert task parameters into database', function() {
      adapter.saveTask(second_ago, func_name, payload);
      adapter.readNextTasks(function(task) {
        expect(task).to.have.property('id', 'at', 'func_name', 'payload');
      });
    });
    test('should store multiple tasks', function() {
      adapter.saveTask(test_json);
      adapter.saveTask(test_json);
      adapter.saveTask(test_json);
      var tasks = [];
      var count = 0;
      adapter.readNextTasks(function(task) {
        if(count)
          expect(tasks).to.be(0);
        tasks.push(task);
        ++count;
      });
    });
    test('should give unique ids to tasks', function() {
      adapter.saveTask(test_json);
      adapter.saveTask(test_json);
      var id = [];
      adapter.readNextTasks(function(task) {
        expect(id).to.contain(task.id);
        id.push(task.id);;
      });
    });
  });
});

