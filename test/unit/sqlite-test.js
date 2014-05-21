var chai = require("chai");
var adapter = require('../../lib/adapters/sqlite');

var expect = chai.expect;

describe('sqlite-adapter', function() {
  var second_ago = new Date() - 1000;

  var worker = 'log';
  var payload = new Buffer(10);
  var test_json = {
    at: second_ago,
    func_name: worker,
    payload: payload
  };

  setup(function() {
  });

  suite('saveTask() and listenTask()', function() {
    test('should insert JSON task into database', function(done) {

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task_id) {
          stop();
          
          dbconn.grabTask(task_id, function(task) {
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

        dbconn.saveTask(test_json, function() {});
      }
      adapter.initialize(null, testScript);
    });

    test('should give unique ids to tasks, part 1', function(done) {

      var items = 3;

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task_id) {
          --items;
          stop();

          dbconn.grabTask(task_id, function(task) {
            try {
              expect(task).to.have.property('at');
              expect(task).to.have.property('func_name');
              expect(task).to.have.property('payload');
            } catch(err) {
              return done(err);
            }
            
          });
          
          if (items <= 0) {
            done();
          }
        });

        dbconn.saveTask(test_json, function() {});
        dbconn.saveTask(test_json, function() {});
        dbconn.saveTask(test_json, function() {});
      }
      adapter.initialize(null, testScript);
    });
    
  });
  
  suite('grabTask()', function() {
    test('should give new task on grab', function(done) {

      var id = -1;

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task_id) {
            stop();
            dbconn.grabTask(task_id, function(task) {
              try {
                expect(task).not.to.equal('undefined');
                done();
              } catch (err) {
                done(err);
              }
            });
            
        });

        dbconn.saveTask(test_json, function() {});

      }
      adapter.initialize(null, testScript);
    });
  });
});
