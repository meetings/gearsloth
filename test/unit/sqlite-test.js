var chai = require("chai");
var adapter = require('../../lib/adapters/sqlite');
var fs = require('fs');

var expect = chai.expect;

suite('sqlite-adapter', function() {

  var worker = 'log';
  var payload = new Buffer(10);
  var test_json = {
    at: new Date(),
    func_name: worker,
    payload: payload,
    strategy:'default'
  };
  
  var test_config = {
    db_opt:{
      db_name:null,
      table_name:"sloth",
      poll_timeout:0
    }
  };
  
  var test_config_with_file = {
    db_opt:{
      db_name:'test-database.sqlite',
      table_name:"sloth",
      poll_timeout:1000
    }
  };
  
  var test_json_with_unset_strategy = {
    at: new Date(),
    func_name: worker,
    payload: payload,
    strategy:null
  };
  
  var test_json_with_strategy_options = {
    at: new Date(),
    func_name: worker,
    payload: payload,
    strategy:'specialized',
    strategy_options: {
      retry:true,
      times:3
    }
  };

  setup(function() {
  });
  teardown(function() {
  });

  suite('sqlite adapter saveTask() and listenTask()', function() {
    test('should insert JSON task into database', function(done) {

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
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

        dbconn.saveTask(test_json, function() {});
      }
      adapter.initialize(test_config, testScript);
    });

    test('should give unique ids to tasks, part 1', function(done) {
      var items = 3;

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          --items;
          stop();

            try {
              expect(task).to.have.property('at');
              expect(task).to.have.property('func_name');
              expect(task).to.have.property('payload');
              expect(task).to.have.property('strategy');
              expect(task.at).to.equal(test_json.at);
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

        dbconn.saveTask(test_json, function() {});
        dbconn.saveTask(test_json, function() {});
        dbconn.saveTask(test_json, function() {});
      }
      adapter.initialize(test_config, testScript);
    });

  });
  
  suite('grabTask()', function() {
    test('should return correct strategy when set', function(done) {
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          stop();
            try {
              expect(task.strategy).to.equal(test_json.strategy);
            } catch(err) {
              return done(err);
            }
            done();
        });

        dbconn.saveTask(test_json, function() {});
      }
      adapter.initialize(test_config, testScript);
    });
    
    test('should return correct strategy when unset', function(done) {
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task_id) {
          stop();
            try {
              expect(task.strategy).to.equal(null);
            } catch(err) {
              return done(err);
            }
            done();
        });

        dbconn.saveTask(test_json_with_unset_strategy, function() {});
      }
      adapter.initialize(test_config, testScript);
    });
    
    test('should return correct strategy and strategy options when set', function(done) {
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task_id) {
          stop();
            try {
              expect(task.strategy).to.equal(test_json_with_strategy_options.strategy);
              expect(task.strategy_options).to.deep.equal(test_json_with_strategy_options.strategy_options);
            } catch(err) {
              return done(err);
            }
            done();
        });
        
        dbconn.saveTask(test_json_with_strategy_options, function() {});
      }
      adapter.initialize(test_config, testScript);
    });
  });
  
  suite('saveTask()', function() {
  
    test('should call callback with error empty invalid task', function(done) {
      function testScript(err, dbconn) {
        dbconn.saveTask({}, function(err) {
          if(err) return done();
        });
      }
      adapter.initialize(test_config, testScript);
    });
    
    test('should call callback with error if task is missing at', function(done) {
      function testScript(err, dbconn) {
        dbconn.saveTask({func_name: 'sinep'}, function(err) {
          if(err) done();
        });
      }
      adapter.initialize(test_config, testScript);
    });
    
    test('should call callback with error if task is missing func_name', function(done) {
      function testScript(err, dbconn) {
        dbconn.saveTask({at: second_ago}, function(err) {
          if(err) done();
        });
      }
      adapter.initialize(test_config, testScript);
    });

  });
  
  suite('updateTask()', function() {
    test('should update task correctly', function(done) {
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          stop();
          dbconn.updateTask(task_id, "FAIL", function() {
            dbconn.grabTask(task_id, function(task) {
              if(task.status === "FAIL") return done();
              done(new Error('status was not FAIL'));
            });
          });
        });
        dbconn.saveTask(test_json, function() {});
      }
      adapter.initialize(test_config, testScript);
    });
  });
  
  suite('deleteTask()', function() {
    test('should delete task correctly', function(done) {
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task_id) {
          stop();
          dbconn.deleteTask(task_id, function() {
            dbconn.grabTask(task_id, function(task) {
              if(!task) return done();
              done(new Error('callback called with a task'));
            });
          });
        });
        dbconn.saveTask(test_json, function() {});
      }
      adapter.initialize(test_config, testScript);
    });
  });

  suite('initialize()', function() {
    test('should create a database to a file', function(done) {
      adapter.initialize(test_config_with_file, function() {
        fs.open('test-database.sqlite', 'r', function(err) {
          if(!err) done();
          else done(new Error('file does not exist'));
          fs.unlink('test-database.sqlite', function() {});
        });
      });
    });
  });  
  
});

