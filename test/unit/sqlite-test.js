var chai = require("chai");
var adapter = require('../../lib/adapters/sqlite');
var fs = require('fs');

var expect = chai.expect;

suite('sqlite-adapter', function() {

  var worker = 'log';
  var payload = new Buffer(10);
  
  var test_config = {
    db_opt:{
      db_name:':memory:',
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
  
 var test_json = {
    at: new Date(),
    func_name: worker,
    payload: "jassoo",
    strategy:'default'
  };
  
 var test_json_unset_delivery = {
    func_name: worker,
    payload: "unset delivery",
    strategy:'default'
  };
  
  var test_json_with_unset_strategy = {
    at: new Date(),
    func_name: worker,
    payload: "jassoo",
    strategy:null
  };
  
  var test_json_with_strategy_options = {
    at: new Date(),
    func_name: worker,
    payload: "jassoo",
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
    
    test('should save current timestamp as execution time when after and at unset', function(done) {
      var items = 2;
      var insertionDate;

      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          --items;
          stop();
            try {
              expect(task).to.have.property('at');
              expect(task).to.have.property('func_name');
              expect(task).to.have.property('payload');
              expect(task).to.have.property('strategy');

              expect(task.at.substring(0, 18)).to.equal(new Date().toISOString().substring(0, 18));
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

        dbconn.saveTask(test_json_unset_delivery, function() {});
        dbconn.saveTask(test_json_unset_delivery, function() {});
      }
      adapter.initialize(test_config, testScript);
    });


  });
  
  suite('listenTask()', function() {
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
  
  suite('updateTask()', function() {
    var roundTrip = 2;
    test('should update task correctly', function(done) {
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          --roundTrip;
          if (roundTrip == 0){
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
            dbconn.updateTask(task, function() {});
          }
        });
        dbconn.saveTask(test_json, function() {});
      }
      adapter.initialize(test_config, testScript);
    });
  });
  
  suite('completeTask()', function() {
    test('should delete task correctly', function(done) {
      function testScript(err, dbconn) {
        var stop = dbconn.listenTask(function (err, task) {
          stop();
          dbconn.completeTask(task, function() {});
          done();
        });
        dbconn.saveTask(test_json, function() {});
      }
      adapter.initialize(test_config, testScript);
    });
  });

  suite('initialize()', function() {
    test('should create a database to a file', function(done) {
      adapter.initialize(test_config_with_file, function() {
        setTimeout(checkFile, 1000);
        function checkFile () {
          fs.open('test-database.sqlite', 'r', function(err) {
            if(!err) done();
            else done(new Error('file does not exist'));
            fs.unlink('test-database.sqlite', function() {});
          });
        }
      });
    });
  });  
  
});

