// require the db adapter
var db = require('../lib/adapters/sqlite');

// initialize with a handle into a regular file, empty for in-memory
var dbconn = db.initialize("DelayedTasks.sqlite");

// check what is the status of the database connection
console.log(dbconn);

// save a task with current date
db.saveTask(new Date(), 'log', 'kittehs');

// read all expired tasks from db and print them
db.readNextTasks(function (err, task) {
  console.log(task);
});

// close the connection
dbconn.close();
