var sqlite3 = require('sqlite3').verbose();

/**
 * Initialize the database with a configuration specific to the adapter.
 * The initialization takes in a callback function which is called after the
 * connection is established. If at any point in initialization there were
 * errors the callback is called with an error object. The callback funtion
 * is otherwise called with a falseish error object and an object that exports
 * the API into the database.
 */
function initialize(config, callback) {

// CONFIGURATION
  var table_name = config.db_opt.table_name;
  
  var db_id = config.db_opt.db_name;
  
  var poll_timeout = config.db_opt.poll_timeout;
  
  var database = new sqlite3.Database(db_id, initTable);
// CONFIGURATION end
  
/*
 * Internal function for initalizing the database table for tasks.
 */
  function initTable(error) {
    if (error) {
      callback(error);
    }

    database.serialize(function() {
     var table_init = "CREATE TABLE IF NOT EXISTS "+table_name+" ( \
           id INTEGER PRIMARY KEY, \
           at DATETIME, \
           task BLOB)";
           
      database.run(table_init, function(error) {
      if(error)
        callback(error);
      });
    });
  }
  
  /*
   * Internal function to construct a timestamp for the database to use.
   */
  function getExpiryTime(task){
    if (task.after) {
      return "'now', '+"+task.after+" seconds'";
    } else if (!task.at) {
      return "'"+new Date().toISOString()+"'";
    } else {
      return "'"+task.at.toISOString()+"'";
    }
  }
  
/*
 * Saves the JSON-task into the database. The timestamp is calculated from the database
 * clock if the `after` field is defined, else from the injectors clock. On error the 
 * callback will be called with an error object, else no parameter is passed to the callback. This 
 * function does not provide rollback.
 */
  function saveTask(task, callback) {
    database.serialize(function() {
      var expiry_time = getExpiryTime(task);
      var insertion = "INSERT INTO "+table_name+" (at, task) VALUES (datetime("+expiry_time+"), ?)";
      database.run(insertion, JSON.stringify(task), function(error) {
        if (error) {
          callback(error);
        }
        callback(error, this.lastID);
      });
    });
  }

/*
 * Starts polling the database for tasks with an expired timestamp
 * and calls the provided callback with a JSON object for each row 
 * returned by the query. Each task is updated before the callback 
 * with their database id, row id and current timestamp. On
 * error the callback is called with an error object, else with the row
 * id, and a falsey error object. The function exports a mechanism to
 * stop the polling function, which takes no arguments. This 
 * function does not provide rollback.
 */
  function listenTask(callback) {
    setTimeout(poll, poll_timeout);
    var cont = true;
    function poll() {
      database.serialize(function() {
        var selection_new = "SELECT * FROM "+table_name+" WHERE datetime('now') >= datetime(sloth.at)";
        database.all(selection_new, function(error, rows) {
          if (error) {
            callback(error);
          }
          if (rows) {
            rows.forEach(function (row) {
              task = JSON.parse(row.task);
              if (!task.at) task.at = new Date().toISOString();
              task.id = {
                task_id: row.id, db_id: db_id
              };
              callback(error, task);
            });
          }
          if (cont) setTimeout(poll, poll_timeout);
        });
        
      });
    }
    return function() {
      cont = false;
    };
  }
  
  /*
   * Updates the given task and calls the provided callback.
   * On error the callback is called with an error object, else with no 
   * argument. This function does not provide rollback.
   */
  function updateTask(task, callback) {
    database.serialize(function() {
      var expiry_time = getExpiryTime(task);
      var update_task = "UPDATE "+table_name+" SET task = ?, at = datetime("+expiry_time+") WHERE id = ?";
      database.run(update_task, JSON.stringify(task), task.id.task_id, function(error) {
        if (error) {
          callback(error);
        }
        callback(error, this.changes);
      });
    });
  }

 /*
   * Deletes the given task from the database. On error the provided
   * callback is called with an error object, else with no argument. This
   * function does not provide rollback.
   */
  function completeTask(task, callback) {
    database.serialize(function() {
      var delete_task = "DELETE FROM "+table_name+" WHERE "+table_name+".id = ?";
      database.run(delete_task, task.id.task_id, function(error) {
        if (error) {
          callback(error);
        }
        callback(error, this.changes);
      });
    });
  }

  callback(null, {
    saveTask: saveTask,
    listenTask: listenTask,
    updateTask: updateTask,
    completeTask: completeTask
  });
}

exports.initialize = initialize;
