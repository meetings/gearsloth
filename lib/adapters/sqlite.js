// require sqlite3, the database type
var sqlite3 = require('sqlite3').verbose();

  // initialize database connection
function initialize(config, callback) {
  var table = "sloths";
  var database;
  var tableInit = "CREATE TABLE IF NOT EXISTS "+table+" ( \
           id INTEGER PRIMARY KEY, at DATETIME, \
           func_name BLOB, payload BLOB)";
           
  var insertion = "INSERT INTO "+table+"(at, func_name, payload) \
           VALUES (?, ?, ?)";
           
  var selection = "SELECT * FROM "+table+" WHERE at < DATETIME()";
    
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
  function saveTask(at, func_name, payload, callback) {
    database.serialize(function() {

    if(!(at instanceof Date) && typeof at === 'object') {  // task json was passed
      callback = func_name;
      var task = at;
      at = task.at;
      func_name = task.func_name;
      payload = task.payload;
    }

      database.run(insertion, at, func_name, payload, function(error) {
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
        
        database.all(selection, function(error, rows) {
         if (error) {
          callback(error);
         }
          rows.forEach(function (row) {
            row.at = new Date(row.at);
            callback(error, row);
          });
          
          if (cont) setTimeout(poll, 1000);
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
    // readTask: readTask
  });
}

  function readMatching(fieldtype, value) {
  }

  function updateTask(id) {
  }

  function deleteTask(id) {
  }

  function deleteMatching(fieldtype, value) {
  }

  exports.initialize = initialize;
