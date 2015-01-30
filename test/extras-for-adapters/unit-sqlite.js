/*jshint -W002*/

var chai = require("chai");
var adapter = require('../../lib/adapters/sqlite');
var fs = require('fs');

var expect = chai.expect;

suite('sqlite-adapter', function() {

  var worker = 'log';
  var payload = new Buffer(10);

  var test_config = {
    dbopt:{
      database_file: ':memory:',
      table_name: "sloth",
      poll_timeout: 0
    }
  };

  var test_config_with_file = {
    dbopt: {
      database_file: '/tmp/test-database.sqlite',
      table_name: "sloth",
      poll_timeout: 1000
    }
  };

 var test_json = {
    at: new Date(),
    func_name: worker,
    payload: "jassoo",
    strategy:'default'
  };

 var test_json_unset_delivery = {
    func_name: worker,
    payload: "unset delivery",
    strategy: 'default'
  };

  var test_json_with_unset_at = {
    after: 0,
    func_name: worker,
    payload: "jassoo",
    strategy: null
  };

  var test_json_with_strategy_options = {
    at: new Date(),
    func_name: worker,
    payload: "jassoo",
    strategy: 'specialized',
    strategy_options: {
      retry: true,
      times: 3
    }
  };

  setup(function(){});
  teardown(function(){});

  suite('saveTask() and listenTask()', function() {
    test('should insert JSON task into database', function(done) {

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function(err, task) {
          stop();
          try {
            expect(task).to.have.property('at');
            expect(task).to.have.property('func_name');
            expect(task).to.have.property('payload');
            expect(task).to.have.property('strategy');
          } catch(err) {
            return done(err);
          }
          done();
        });
        dbconn.saveTask(test_json, function(err, id) {});
      }
      adapter.initialize(test_config, testScript);
    });

    test('should give unique ids to tasks, part 1', function(done) {
      var items = 3;

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function(err, task) {
          --items;
          stop();

          try {
            expect(task).to.have.property('at');
            expect(task).to.have.property('func_name');
            expect(task).to.have.property('payload');
            expect(task).to.have.property('strategy');
            expect(task.func_name).to.equal(test_json.func_name);
            expect(task.payload).to.deep.equal(test_json.payload);
            expect(task.strategy).to.equal(test_json.strategy);
          } catch(err) {
            return done(err);
          }

          if (items <= 0) {
            done();
          }
        });
        dbconn.saveTask(test_json, function(){});
        dbconn.saveTask(test_json, function(){});
        dbconn.saveTask(test_json, function(){});
      }
      adapter.initialize(test_config, testScript);
    });

    test('should save current timestamp as execution time when after and at unset', function(done) {
      var items = 2;

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function(err, task) {
          --items;
          stop();

          try {
            expect(task).to.have.property('at');
            expect(task).to.have.property('func_name');
            expect(task).to.have.property('payload');
            expect(task).to.have.property('strategy');

            var now = new Date();
            var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

            expect(task.at.substring(0, 17))
              .to.equal(utc.toISOString().substring(0, 17));
            expect(task.func_name).to.equal(test_json_unset_delivery.func_name);
            expect(task.payload).to.deep.equal(test_json_unset_delivery.payload);
            expect(task.strategy).to.equal(test_json_unset_delivery.strategy);
          } catch(err) {
            return done(err);
          }

          if (items <= 0) {
            done();
          }
        });
        dbconn.saveTask(test_json_unset_delivery, function(){});
        dbconn.saveTask(test_json_unset_delivery, function(){});
      }
      adapter.initialize(test_config, testScript);
    });

    test('should behave correctly with no configuration', function(done) {
      var items = 2;

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function(err, task) {
          --items;
          stop();

          try {
            expect(task).to.have.property('at');
            expect(task).to.have.property('func_name');
            expect(task).to.have.property('payload');
            expect(task).to.have.property('strategy');
            expect(task).to.have.property('id');

            var now = new Date();
            var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

            expect(task.at.substring(0, 17))
              .to.equal(utc.toISOString().substring(0, 17));
            expect(task.func_name).to.equal(test_json_unset_delivery.func_name);
            expect(task.payload).to.deep.equal(test_json_unset_delivery.payload);
            expect(task.strategy).to.equal(test_json_unset_delivery.strategy);
          } catch(err) {
            return done(err);
          }

          if (items <= 0) {
            done();
            fs.open('/temp/test-database.sqlite', 'r', function(err) {
              fs.unlink('/temp/test-database.sqlite', function(){});
            });
          }
        });
        dbconn.saveTask(test_json_unset_delivery, function(err, id) {});
        dbconn.saveTask(test_json_unset_delivery, function(){});
      }
      adapter.initialize(test_config, testScript);
    });

  });

  suite('listenTask()', function() {
    test('should return correct strategy when set', function(done) {
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function(err, task) {
          stop();
          try {
            expect(task.strategy).to.equal(test_json.strategy);
          } catch(err) {
            return done(err);
          }
          done();
        });
        dbconn.saveTask(test_json, function(){});
      }
      adapter.initialize(test_config, testScript);
    });

    test('should return correct at when unset', function(done) {
      var now = new Date();
      var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function(err, task) {
          stop();
          try {
            expect(task.strategy).to.equal(null);
            expect(task).to.have.property('at');
            expect(task.at.substring(0, 17))
              .to.equal(utc.toISOString().substring(0, 17));
          } catch(err) {
            return done(err);
          }
          done();
        });
        dbconn.saveTask(test_json_with_unset_at, function(){});
      }
      adapter.initialize(test_config, testScript);
    });

    test('should return correct strategy and strategy options when set', function(done) {
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function(err, task) {
          stop();
          try {
            expect(task.strategy).to.equal(test_json_with_strategy_options.strategy);
            expect(task.strategy_options).to.deep.equal(test_json_with_strategy_options.strategy_options);
          } catch(err) {
            return done(err);
          }
          done();
        });
        dbconn.saveTask(test_json_with_strategy_options, function(){});
      }
      adapter.initialize(test_config, testScript);
    });

    test('should not return a task when disabled', function(done){
      function testScript(err, dbconn) {
        var count = 0;
        var disabled_task_id;
        var stop = dbconn.listenTask(function(err, task){
          ++count;
          task.after = 0;
          dbconn.updateTask(task, function(){});
          if (count === 1) {
            disabled_task_id = task.id;
            dbconn.disableTask(task, function(){});
          }
          if (count > 1) {
            try {
              expect(disabled_task_id).not.to.equal(task.id);
            } catch (err) {
              done(err);
            }
          }
          if (count === 4) {
            stop();
            done();
          }
        });
        dbconn.saveTask(test_json, function(){});
        dbconn.saveTask(test_json_unset_delivery, function(){});
      }
      adapter.initialize(test_config, testScript);
    });
  });

  suite('updateTask()', function() {
    var roundTrip = 2;
    test('should update task correctly', function(done) {
      this.timeout(5000);
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function(err, task) {
          --roundTrip;
          if (roundTrip === 0){
            stop();
            try {
              expect(task.func_name).to.equal("lolleros");
              expect(task.after).to.equal(1);
            } catch (err) {
              return done(err);
            }
            done();
          } else {
            task.func_name = "lolleros";
            task.after = 1;
            dbconn.updateTask(task, function(){});
          }
        });
        dbconn.saveTask(test_json, function(){});
      }
      adapter.initialize(test_config, testScript);
    });
  });

  suite('completeTask()', function() {
    test('should delete task correctly', function(done) {
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function(err, task) {
          stop();
          dbconn.completeTask(task, function(){});
          done();
        });
        dbconn.saveTask(test_json, function(){});
      }
      adapter.initialize(test_config, testScript);
    });
  });

  suite('initialize()', function() {
    test('should create a database to a file', function(done) {
      adapter.initialize(test_config_with_file, function() {
        setTimeout(checkFile, 1000);
        function checkFile () {
          fs.open('/tmp/test-database.sqlite', 'r', function(err) {
            if(!err) done();
            else done(new Error('file does not exist'));
            fs.unlink('/tmp/test-database.sqlite', function(){});
          });
        }
      });
    });
  });

});
