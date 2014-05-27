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

// internal variables 
  var table_name = "sloth";

  var database;
// database query strings
  var table_init = "CREATE TABLE IF NOT EXISTS "+table_name+" ( \
           id INTEGER PRIMARY KEY, \
           at DATETIME, \
           after INTEGER, \
           task BLOB)";
           
  var insertion = "INSERT INTO "+table_name+"(at, after, task) VALUES (?, ?, ?)";
           
  var selection_new = "select * from sloth where (strftime(sloth.at / 1000) - strftime('%s', 'now')) < 0";
  
//  "SELECT * FROM "+table_name+" \
  //        WHERE datetime('now') > datetime(("+table_name+".at + "+table_name+".after))";
                   
  var selection_task = "SELECT * FROM "+table_name+" WHERE id = ?";
  
  var update_task = "UPDATE "+table_name+" SET task = ? at = ? after = ? WHERE id = ?";
  
  var delete_task = "DELETE FROM "+table_name+" WHERE id = ?";
// internal variables end


  // TODO parse configuration from file
  var db_id = config;
  
  if (!config) {
    database = new sqlite3.Database(':memory:', initTable );
  } else {
    database = new sqlite3.Database(config, initTable );
  }
    
/*
 * Closed function for initalizing the database table for tasks, not visible
 * to the outside.
 */
  function initTable(error) {
    if (error) {
      callback(error);
    }

    database.serialize(function() {
           
      database.run(table_init, function(error) {
      if(error)
        callback(error);
      });
    });
  }
  
/*
 * Saves the JSON-task into the database. On error the callback will be called
 * with an error object, else no parameter is passed to the callback. This 
 * function does not provide rollback.
 */
  function saveTask(task, callback) {
    database.serialize(function() {
    
    if (!task.at) task.at = new Date();
    if (!task.after) task.after = 0;
    
    task.at.setSeconds(task.at.getSeconds() + task.after);

      database.run(insertion, task.at, (task.after*1000), JSON.stringify(task), function(error) {
        if (error) {
          callback(error);
        }
        callback();
      });
    });
  }

/*
 * Starts polling the database for tasks with the ´status.NEW´ status
 * and calls the provided callback for each row returned by the query. On
 * error the callback is called with an error object, else with the row
 * id, and a falsey error object. The function exports a mechanism to
 * stop the polling function, which takes no arguments. Default polling
 * interval is 1000 ms. This function does not provide rollback.
 */
  function listenTask(callback) {
    setTimeout(poll, 0);
    
    var cont = true;
    
    function poll() {
      database.serialize(function() {
        database.all(selection_new, function(error, rows) {
        console.log(selection_new);
          if (error) {
            callback(error);
          }
          if (rows) {
            rows.forEach(function (row) {
              task = JSON.parse(row.task);
              task.task_id = row.id;
              task.db_id = db_id;
              callback(error, task);
            });
          }
          if (cont) setTimeout(poll, 1000); //default polling interval 1000 ms
        });
        
      });
    }
    return function() {
      cont = false;
    }
  }
  
  /*
   * Updates the status of a task and calls the provided callback.
   * On error the callback is called with an error object, else with no 
   * argument. This function does not provide rollback.
   * "UPDATE "+table_name+" SET task = ? at = ? after = ? WHERE id = ?";
   */

  function updateTask(task, callback) {
    database.serialize(function() {
      database.run(update_task, task, task.at, task.after, task.task_id, function(error) {
        if (error) {
          callback(error);
        }
        callback();
      });
    });
  }

  
  /*
   * Grabs a task from the database with the provided id for execution. The
   * function selects and updates the task with the given id from ´status.NEW´
   * to ´status.PENDING´, so that no other worker may execute the task. On
   * error the callback is called with an error object, else with no argument.
   * This function does not provide rollback.
   
   DEPRECATED

  function grabTask(id, callback) {
    database.serialize(function() {
      database.get(selection_task, id, function(error, row) {
        if (error) {
          callback(error)
        }
        if (row) {
          database.run(update_task, status.PENDING, id, function(error) {
            if (error) {
              callback(error);
            }
            try {
              row.strategy_options = JSON.parse(row.strategy_options);
            }
            catch(err){
              callback(err);
              return;
            }
            callback(row);
          });
        } else {
          callback();
        }
      });
    });
  }  
  */
  
  /*
   * Deletes the task with the given id from the database. The function takes
   * in a task id as numeral and deletes the task. On error the provided
   * callback is called with an error object, else with no argument. This
   * function does not provide rollback.
   */
  function deleteTask(id, callback) {
    database.serialize(function() {
      database.run(delete_task, id, function(error) {
        if (error) {
          callback(error);
        }
        callback();
      });
    });
  }

  callback(null, {
    saveTask: saveTask,
    listenTask: listenTask,
//    updateTask: updateTask,   DEPRECATED
//    grabTask: grabTask,       DAPRECATED
    deleteTask: deleteTask
  });
}

exports.initialize = initialize;
