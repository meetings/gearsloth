var chai = require("chai");
var adapter = require('../../lib/adapters/sqlite');

var expect = chai.expect;

describe('sqlite-adapter', function() {
  var second_ago = new Date() - 1000;

  var worker = 'log';
  var payload = new Buffer(10);
  var test_json = {
    at: second_ago,
    worker: worker,
    payload: payload
  };

  setup(function() {
  });

  suite('saveTask() and listenTask()', function() {
    test('should insert JSON task into database', function(done) {

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          stop();

          try {
            expect(task).to.have.property('at');
            expect(task).to.have.property('worker');
            expect(task).to.have.property('payload');
          } catch(err) {
            return done(err);
          }
          done();

        });

        dbconn.saveTask(test_json, function() {});
      }
      adapter.initialize(null, testScript);
    });

    test('should insert task parameters into database', function(done) {

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          stop();
          
          try {
            expect(task).to.have.property('at');
            expect(task).to.have.property('worker');
            expect(task).to.have.property('payload');
          } catch(err) {
            return done(err);
          }
          done();

        });

        dbconn.saveTask(second_ago, worker, payload, function() {});
      }
      adapter.initialize(null, testScript);
    });

    test('should give unique ids to tasks, part 1', function(done) {

      var items = 3;

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          --items;
          stop();

          try {
            expect(task).to.have.property('at');
            expect(task).to.have.property('worker');
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
      adapter.initialize(null, testScript);
    });

    test('should give unique ids to tasks, part 2', function(done) {

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
      adapter.initialize(null, testScript);
    });
    
    test('should update statusfield upon poll', function(done) {

      var poll_count = 2;

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          if (poll_count === 0 ) {
            stop();
           try {
            expect(task.status).to.equal("pending");  
           } catch(err) {
            return done(err);
           }

           if(poll_count === 0)
             done();
           }
          --poll_count;
        });

        dbconn.saveTask(test_json, function() {});
        dbconn.saveTask(test_json, function() {});
      }
      adapter.initialize(null, testScript);
    });
  });
});
