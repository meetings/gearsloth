## Database adapter API

The database adapters implement the interface that should be used from within *injectors*, *runners* and *ejectors*. Each adapter implements the following functions in accordance with their specified database type:

* `initialize(configuration, callback)`: Initializes the database connection(s) with given configuration, then calls the callback whilst exporting the actual API into the database. All operations must thus be done inside the callback. See "Examples". The configuration is given as a JSON object and is adapter dependent, see "Configuration".
* `saveTask(task, callback)`: Saves the given `task` JSON object into the database, then calls the callback. If at any point there were errors the callback is called with an error object as the first argument. If the operation succeeded the callback is called with a 'null' error object and the row ID, as the first and second argument respectively.
* `listenTask(callback)`: Listens to (or polls, depending on database type) expiring tasks and calls the callback function with each `task` returned by the database query. On error the callback is called with an error object. If the operation succeeded the callback is called with a 'null' error object and the `task` JSON object, as the first and second argument respectively. A function for halting the `listenTask` function is exported from this, and it can be provided with a callback (see "Examples"). The function will update all result rows, so that no other *runner* may select and pass the tasks on for duplicate execution.
* `updateTask(task, callback)`: Updates the given `task` JSON object in the database identified by the *task.id.task_id* and *task.id.db_id*, then calls the callback. On error the callback is called with an error object, else with a 'null' error object and the number of rows to which the *update* operation had effect, as first and second argument respectively. The number of changed rows should be 1 if update succeeded, and 0 if the task was not found in the database (not present or wrong identifier in the `task` JSON object).
* `completeTask(task, callback)`: Deletes the given `task` from the database. On error the callback is called with an error object. If the operation succeeded the callback is called with a 'null' error object and the number of rows affected by the operation, as first and secdond argument respectively. The number of affected rows should be 1 if the delete operation succeeded, else the task was not found in the database (not present or wrong id in the `task` JSON object).
* `disableTask(task, callback)`: Disables the `task` from being run. On error the callback is called with an error object, else with a 'null' error object and the number of affected rows. This is used then the *runner_retry_count* of the task falls to zero after being non-zero, and action should be taken to take care of the problem. This situation will arise if the *controller* responsible for the task has repeatedly been unavailable or has not called upon the *ejector* to complete the task.


# Adapters

Currently there are 2 complete adpters: 'sqlite.js', which uses the sqlite3.js npm package, and 'mem.js' which doesn't require any packages and works only as 'in-memory'. A mysql adapter is being developed.

## Sqlite3

This adapter requires the sqlite3.js npm package which can be installed by issuing the command:
```
npm install sqlite3
```

### Configuration

The sqlite-adapter configuration takes in a JSON object that describes the following properties of the database:

* `config.dbopt.table_name`: The name of the table into which the tasks are to be saved. If unset a default value of *"DelayedTasks"* is used.
* `config.dbopt.db_name`: The filename which is used for the database. An 'in-memory' database can be used by providing the `':memory:'` string as the db_name. The 'in-memory' database will be lost once the execution of the process ends, and it will not be accessible to other instances of adapters. An aboslute path to the datbase should be used. If unset a default value of *"/tmp/DelayedTasks.sqlite"* is used.
* `config.dbopt.poll_timeout`: A non-zero time value in milliseconds which the adaters database polling function is to timeout before the next query. If unset a default value of *1000* milliseconds is used.
* `config.dbopt.pre_poll`: A non-zero time value in secods that is subtracted from the exipry time of the task to accomplish retrieving tasks before they expire. If unset a default value of *0* seconds is used.

The initialization may also be called without any configuration to adopt all default cofigurations, for example:
```
var adapter = require('../../lib/adapters/sqlite');
adapter.initialize(null, someScriptToExecute);
```

### Notes

None of the functions implemented in the adapter provide rollback, so it is important that they are used correctly. At the moment the database calls are NOT sanitized, all effort will be made to make this happen.









