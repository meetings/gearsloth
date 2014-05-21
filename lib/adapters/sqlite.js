// require sqlite3, the database type
var sqlite3 = require('sqlite3').verbose();

  // initialize database connection
function initialize(config, callback) {
  var table = "sloth";
  var status = {NEW:"NEW",
              PENDING:"PENDING",
              DONE:"DONE",
              FAIL:"FAIL"};
              
  var database;
  var tableInit = "CREATE TABLE IF NOT EXISTS "+table+" ( \
           id INTEGER PRIMARY KEY, at DATETIME, \
           func_name BLOB, payload BLOB, \
           strategy BLOB, strategy_options BLOB, \
           status VARCHAR(10))";
           
  var insertion = "INSERT INTO "+table+"(\
            at, func_name, payload, strategy, strategy_options, status) \
           VALUES (?, ?, ?, ?, ?, ?)";
           
  var selection_new = "SELECT * FROM "+table+" WHERE at < DATETIME() \
                   AND status = '"+status.NEW+"'";
                   
  var selection_id = "SELECT * FROM "+table+" WHERE id = ?";
  
  var update_task = "UPDATE "+table+" SET status = ? WHERE id = ?";

  // TODO parse configuration from file
  

  if (!config) {
    database = new sqlite3.Database(':memory:', initTable );
  } else {
    database = new sqlite3.Database(config, initTable );
  }
    
  // callback function to be called on connection initialization
  function initTable(error) {
    if (error) {
      callback(error);
    }

    database.serialize(function() {
           
      database.run(tableInit, function(error) {
      if(error)
        callback(error);
      });
    });
  }
  
  // save the given task into the database
  function saveTask(task, callback) {
    database.serialize(function() {

      database.run(insertion, task.at, task.func_name, task.payload, task.strategy, task.strategy_options, status.NEW, function(error) {
        if (error) {
          callback(error);
        }
        callback();
      });
    });
  }

  function listenTask(callback) {
    setTimeout(poll, 0);
    
    var cont = true;
    
    function poll() {
      database.serialize(function() {
        
        database.all(selection_new, function(error, rows) {
         if (error) {
          callback(error);
         }
          rows.forEach(function (row) {
            row.at = new Date(row.at);
            callback(error, row.id);
          });
          
          if (cont) setTimeout(poll, 1000);
        });
        
      });
    }
    return function() {
      cont = false;
    }
  }
  
  function updateTask(id, status, callback) {
    database.serialize(function() {

    database.run(update_task, status, id, function(error) {
      if (error) {
        callback(error);
      }
      callback();
        
      });
    });
  }
  
  function grabTask(id, callback) {
    database.serialize(function() {
      database.get(selection_id, id, function(error, row) {
        if (error) {
          callback(error)
        }
        if (row) {
          database.run(update_task, status.PENDING, id, function() {
            if (error) {
              callback(error);
            }
            callback(row);
          });
        } else {
          callback();
        }
      });
    });
  }

  callback(null, {
    status: status,
    saveTask: saveTask,
    listenTask: listenTask,
    updateTask: updateTask,
    grabTask: grabTask
  });
}



  function deleteTask(id) {
  }

  function deleteMatching(fieldtype, value) {
  }

  exports.initialize = initialize;
