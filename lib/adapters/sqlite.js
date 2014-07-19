var sqlite3 = require('sqlite3').verbose();
var log = require('../log');
var fs = require('fs');
var os = require("os");
var async = require('async');

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
  config = config ? config : { dbopt:{} };
  config.dbopt = config.dbopt ? config.dbopt : {};

  var table_name = config.dbopt.table_name ? config.dbopt.table_name : "DelayedTasks";

  var db_id = config.dbopt.db_name ? config.dbopt.db_name : "DelayedTasks.sqlite";

  var poll_timeout = (!isNaN(config.dbopt.poll_timeout)) ? config.dbopt.poll_timeout : 1000;

  var pre_poll = (!isNaN(config.dbopt.pre_poll)) ? config.dbopt.pre_poll : 0;

  var default_timeout = (!isNaN(config.dbopt.default_timeout)) ? config.dbopt.default_timeout : 1000;

  var domain = config.dbopt.domain ? config.dbopt.domain : os.hostname();

  var database = new sqlite3.Database(db_id, initTable);
// CONFIGURATION end

/*
 * Internal function for initalizing the database table for tasks.
 */
  function initTable(error) {
    if (error) {
      console.log(error);
      callback(error);
    }

    var try_table_init_n_times = function( rounds_left ) {
      database.get("SELECT name FROM sqlite_master WHERE type='table' AND name='"+table_name+"'", function( err, row ) {
        if ( row ) {
          finalizeInitialization();
        }
        else {
          var table = [
            [ "id", "INTEGER PRIMARY KEY" ],
            [ "at", "DATETIME" ],
            [ "task", "BLOB" ],
            [ "disabled", "BOOL" ],
          ];
          var columns_create = table.map( function ( column ) { return column.join( " " ) } ).join( ", ");
          var table_init = "CREATE TABLE IF NOT EXISTS " + table_name + " ( " + columns_create + " )";

          log.debug('sqlite-adapter', 'Running query:', table_init);

          database.run( table_init, function(error) {
            if ( error ) {
              if ( rounds_left > 1 ) {
                setTimeout( function() {
                  log.debug('sqlite-adapter', 'Retrying query:', table_init);
                  try_table_init_n_times( rounds_left - 1 );
                }, 100 + Math.floor( Math.random() * 900 ) );
              }
              else {
                console.log("Could not initialize sqlite database after 10 tries");
                callback(error);
              }
            }
            else {
              finalizeInitialization();
            }
          } );

        }
      });
    }

    try_table_init_n_times( 10 );
  }

  /*
   * Internal function to construct a timestamp for the database to use.
   */
  function getExpiryTime(task){
    if (!isNaN(task.after)) {
      return "'now', '+"+task.after+" seconds'";
    } else if (!task.at) {
      task.at = new Date();
    }
    if (task.at.toISOString) {
      return "'"+task.at.toISOString()+"'";
    }
    return "'"+task.at+"'";
  }

/*
 * Saves the JSON-task into the database. The timestamp is calculated from the database
 * clock if the `after` field is defined, else from the injectors clock. On error the
 * callback will be called with an error object, else a number indicating the row
 * identifier is passed to the callback. This function does not provide rollback.
 */
  function saveTask(task, callback) {
    database.serialize(function() {
      var expiry_time = getExpiryTime(task);
      var insertion = "INSERT INTO "+table_name+" (at, task, disabled) VALUES (datetime("+expiry_time+"), ?, 'FALSE')";

      log.debug('sqlite-adapter','Running query:',insertion);
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
 * that are not disabled. The provided callback is called only after
 * the expiry time of the task is updated if it still satisfied the
 * original query predicate. Callback is called wirha JSON object for
 * each row returned by the query. Each task is updated before the callback
 * with their database id, row id, current timestamp and first_run time. On
 * error the callback is called with an error object The function also
 * exports a mechanism to stop the polling function, which takes an optional
 * callback. This function does not provide rollback.
 */
  function listenTask(callback) {
    setTimeout(poll, poll_timeout);
    var cont = true;
    function poll() {
      database.serialize(function() {
        var predicate = "(datetime('now') >= datetime("+table_name+".at, '-"+pre_poll+" seconds')) "
        +"AND disabled = 'FALSE'";

        var selection_new = "SELECT * FROM "+table_name+" WHERE "+predicate;

        var update_selection = "UPDATE "+table_name
        +" SET at = datetime('now', '+"+default_timeout+" seconds')"
        +" WHERE ("+table_name+".id = ?) AND "+predicate;

        log.debug('sqlite-adapter','Running query:',selection_new);
        database.all(selection_new, function(error, rows) {
          if (error) {
            callback(error);
          }
          if (rows) {
            rows.forEach(function (row) {
              log.debug('sqlite-adapter','Running query:',update_selection);

              database.run(update_selection, row.id, function(error) {
                if (this.changes) {
                  task = JSON.parse(row.task);
                  task.at = new Date(row.at);
                  // task.first_run = task.first_run ? task.first_run : task.at;
                  task.id = row.id;
                  callback(error, task);
                }
              });
            });
          }
          if (cont) setTimeout(poll, poll_timeout);
        });

      });
    }
    return function(callback) {
      cont = false;
      if (callback) callback();
    };
  }

  /*
   * Updates the given task and calls the provided callback.
   * On error the callback is called with an error object, else with a
   * 'null' error object and the number of affected rows.
   * This function does not provide rollback.
   */
  function updateTask(task, callback) {
    database.serialize(function() {
      var expiry_time = getExpiryTime(task);
      var update_task = "UPDATE "+table_name+" SET task = ?, "
      +"at = datetime("+expiry_time+") WHERE "+table_name+".id = ?";

      log.debug('sqlite-adapter','Running query:',update_task);
      database.run(update_task, JSON.stringify(task), task.id, function(error) {
        if (error) {
          callback(error);
        }
        callback(error, this.changes);
      });
    });
  }

  /*
   * Disables the given task from being executed, but does not delete it.
   * If the operation succeeded the callback is called with a 'null' error
   * object and the number of rows affected by the call. On error the
   * only argument is an error object. Does not provide rollback.
   */
  function disableTask(task, callback) {
    database.serialize(function() {
      var update_task = "UPDATE "+table_name+" SET task = ?, disabled = 'TRUE' WHERE "+table_name+".id = ?";

      log.debug('sqlite-adapter','Running query:',update_task);
      database.run(update_task, JSON.stringify(task), task.id, function(error) {
        if (error) {
          callback(error);
        }
        callback(error, this.changes);
      });
    });
  }

 /*
   * Deletes the given task from the database. On error the provided
   * callback is called with an error object, else with the number of
   * affected rows. This function does not provide rollback.
   */
  function completeTask(task, callback) {
    database.serialize(function() {
      var delete_task = "DELETE FROM "+table_name+" WHERE "+table_name+".id = ?";

      log.debug('sqlite-adapter','Running query:',delete_task);
      database.run(delete_task, task.id, function(error) {
        if (error) {
          callback(error);
        }
        callback(error, this.changes);
      });
    });
  }

  /*
   * Test helpers
   */

  function testInterfaceWipeDatastore(callback) {
    async.parallel([
      function(next) {
        fs.exists(db_id, function(exists){
          if (exists) {
            fs.unlink(db_id, function() {
                next();
            });
          } else {
            next();
          }
        });
      }, 
      function(next) {
        fs.exists(db_id+'-journal', function(exists){
          if (exists) {
            fs.unlink(db_id+'-journal', function() {
                next();
            });
          } else {
            next();
          }
        });
      }
      ], callback );
  }

  function testInterfaceGatherEnabledJobMetaList(callback) {
    var job_meta_list = [];
    var selection_all = "SELECT * FROM "+table_name;
    database.all(selection_all, function(error, rows) {
      rows.forEach(function (row){
        var job = {
          domain : domain,
          job : JSON.parse(row.task)
        }
        job_meta_list.push(job);
      });
      callback(null, job_meta_list);
    });
  }

  function finalizeInitialization() {
    callback(null, {
      saveTask: saveTask,
      listenTask: listenTask,
      updateTask: updateTask,
      completeTask: completeTask,
      disableTask: disableTask,
      testInterfaceWipeDatastore: testInterfaceWipeDatastore,
      testInterfaceGatherEnabledJobMetaList: testInterfaceGatherEnabledJobMetaList
    });
  }
}

function testInterfaceReturnDbopt() {
    return {
      'db_name' : '/tmp/gearloth_test_db.sqlite',
      'poll_timeout' : 100
    };
  }

exports.initialize = initialize;
exports.testInterfaceReturnDbopt = testInterfaceReturnDbopt;