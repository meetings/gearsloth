// require sqlite3, the database type
var sqlite3 = require('sqlite3').verbose();
var database;
var table = "sloths";

// callback function to be called on connection initialization
function initTable(error) {
  if (error) {
    console.log(error.toString());
    return null;
  }

  database.serialize(function() {
    var query = "CREATE TABLE \
      IF NOT EXISTS sloths ( \
        id INTEGER PRIMARY KEY, \
        at DATETIME, \
        func_name VARCHAR(60), \
        payload BLOB)";

    database.run(query, function(error) {
      if(error)
        console.log(error.toString());
      });
  });
  }

  // initialize database connection from handle or into memory
  function initializeWithHandle(db_handle) {
    if (!db_handle) {
      database = new sqlite3.Database(':memory:', initTable );
    } else {
      database = new sqlite3.Database(db_handle, initTable );
    }

    return database;
  }

  // initialize database connections from configuration file
  function initializeFromFile(configuration) {
  }

  // save the given task into the database
  function saveTask(at, func_name, payload) {
    database.serialize(function() {
      
      if(!(at instanceof Date) && typeof at === 'object') {  // task json was passed
        var task = at;
        at = task.at;
        func_name = task.func_name;
        payload = task.payload;
      }

      var query = "INSERT INTO sloths \
              (at, func_name, payload) \
              VALUES (?, ?, ?)";

      database.run(query, at, func_name, payload, function(error) {
        if(error)
          console.log(error.toString());
        });
    });
  }

  // reads tasks whose scheduled time has passed and calls
  // callback for each of them
  function readNextTasks(callback) {
    database.serialize(function() {
      var query = "SELECT * FROM sloths WHERE at < DATETIME()";
      database.each(query, function(error, row) {
        if(error) {
          console.log(error.toString());
          return
        }
        row.at = new Date(row.at);
        callback(row);
      });
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

  // methods visible to the outside
  exports.initializeWithHandle = initializeWithHandle;
  exports.saveTask = saveTask;
  exports.readNextTasks = readNextTasks;
//  exports.update = update;
//  exports.deleteSingle = deleteSingle;
