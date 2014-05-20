// require sqlite3, the database type
var sqlite3 = require('sqlite3').verbose();

  // initialize database connection
function initialize(config, callback) {
  var table = "sloth";
  var status = {new:"new",
              pending:"pending",
              done:"complete",
              fail:"failed"};
  var database;
  var tableInit = "CREATE TABLE IF NOT EXISTS "+table+" ( \
           id INTEGER PRIMARY KEY, at DATETIME, \
           worker BLOB, payload BLOB, status VARCHAR(10))";
           
  var insertion = "INSERT INTO "+table+"(at, worker, payload, status) \
           VALUES (?, ?, ?, ?)";
           
  var selection_new = "SELECT * FROM "+table+" WHERE at < DATETIME() \
                   AND status = '"+status.new+"'";
                   
  var selection_redo = "SELECT * FROM "+table+" WHERE status = \
                        '"+status.pending+"' AND \
                        at < DATETIME('now', '-10 minutes')";
  
  var update_pending = "UPDATE "+table+" SET status = '"+status.pending+"' WHERE id = ?";

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
  function saveTask(at, worker, payload, callback) {
    database.serialize(function() {
      if(!(at instanceof Date) && typeof at === 'object') {  // task json was passed
      callback = worker;
      var task = at;
      at = task.at;
      worker = task.worker;
      payload = task.payload;
    }

      database.run(insertion, at, worker, payload, status.new, function(error) {
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
            database.run(update_pending, row.id, function(error) {
              if (error) callback(error); 
            });
            
            row.at = new Date(row.at);
            callback(error, row);
          });
          
          if (cont) setTimeout(poll, 1000);
        });
        
        database.all(selection_redo, function(error, rows) {
          if (error) {
            callback(error);
          }
          rows.forEach(function (row) {
            row.at = new Date(row.at);
            callback(error, row);
          });
        });
        
      });
    }
    return function() {
      cont = false;
    }
  }

  callback(null, {
    saveTask: saveTask,
    listenTask: listenTask
  });
}

  function updateTask(id) {
  }

  function deleteTask(id) {
  }

  function deleteMatching(fieldtype, value) {
  }

  exports.initialize = initialize;
