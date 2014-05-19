// require sqlite3, the database type
var sqlite3 = require('sqlite3').verbose();

  // initialize database connection
function initialize(config, callback) {
  var table = "sloths";
    
  // TODO parse configuration from file
  
  var database;
  if (!config) {
    database = new sqlite3.Database(':memory:', initTable );
  } else {
    database = new sqlite3.Database(config, initTable );
  }
    
  // callback function to be called on connection initialization
  function initTable(error) {
    if (error) {
      console.log(error.toString());
      return null;
    }

    database.serialize(function() {
      var query = "CREATE TABLE \
        IF NOT EXISTS "+table+" ( \
           id INTEGER PRIMARY KEY, \
           at DATETIME, \
           func_name BLOB, \
           payload BLOB)";

      database.run(query, function(error) {
      if(error)
        console.log(error.toString());
      });
    });
  }
  
  // save the given task into the database
  function saveTask(at, func_name, payload, callback) {
    database.serialize(function() {

    if(!(at instanceof Date) && typeof at === 'object') {  // task json was passed
      var task = at;
      at = task.at;
      func_name = task.func_name;
      payload = task.payload;
    }

    var query = "INSERT INTO "+table+" \
            (at, func_name, payload) \
            VALUES (?, ?, ?)";

      database.run(query, at, func_name, payload, function(error) {
        if (error) {
          console.log(error.toString());
        }
        callback(error);
      });
    });
  }

  function listenTask(callback) {
    setTimeout(poll, 1000);
    
    var cont = true;
    
    function poll() {
      database.serialize(function() {
        var query = "SELECT * FROM "+table+" WHERE at < DATETIME()";
        database.each(query, function(error, row) {
          if (error) {
            console.log(error.toString());
          } else {
            row.at = new Date(row.at);
          }
          callback(error, row);
        });
           
        if (cont) setTimeout(poll, 1000);
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
