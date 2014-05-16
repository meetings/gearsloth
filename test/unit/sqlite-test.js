var chai = require("chai");
var chai_as_promised = require("chai-as-promised");
var adapter = require('../../lib/adapters/sqlite');
var sqlite3 = require('sqlite3').verbose();

chai.use(chai_as_promised);
var expect = chai.expect;
describe('sqlite-adapter', function() {

  // datetime a second a go
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
    test('should insert JSON task into database', function(done) {
      adapter.saveTask(test_json);
      adapter.readNextTasks(function(task) {
        try {
          expect(task).to.have.property('at');        
          expect(task).to.have.property('func_name');        
          expect(task).to.have.property('payload');        
        } catch(err) {
          return done(err);
        }
        done();
      });
    });
    test('should insert task parameters into database', function(done) {
      adapter.saveTask(second_ago, func_name, payload);
      adapter.readNextTasks(function(task) {
        try {
          expect(task).to.have.property('at');        
          expect(task).to.have.property('func_name');        
          expect(task).to.have.property('payload');        
        } catch(err) {
          return done(err);
        }
        done();
      });
    });
    test('should give unique ids to tasks', function(done) {
      adapter.saveTask(test_json);
      adapter.saveTask(test_json);
      adapter.saveTask(test_json);
      var countdown = 3;
      adapter.readNextTasks(function(task) {
        --countdown;
        if(countdown === 0)
          done();
      });
    });
    test('should give unique ids to tasks', function(done) {
      adapter.saveTask(test_json);
      adapter.saveTask(test_json);
      var id = -1;
      adapter.readNextTasks(function(task) {
        try {
          expect(id).to.not.equal(task.id);
        } catch(err) {
          return done(err);
        }
        if(id != -1)
          done();
        id = task.id;
      });
    });
  });
});

