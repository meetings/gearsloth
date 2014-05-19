// require the db adapter
var db = require('../lib/adapters/sqlite');

// initialize with a handle into a regular file, empty for in-memory
db.initialize("DelayedTasks.sqlite", afterInit );

function afterInit(dbconn) {
	dbconn.saveTask(new Date(), 'log', 'kittehs');

	dbconn.readNextTasks(function (err, task) {
  		console.log(task);
	});

	dbconn.close();
}

// check what is the status of the database connection
console.log(dbconn);

// save a task with current date
dbconn.saveTask(new Date(), 'log', 'kittehs');

// read all expired tasks from db and print them
dbconn.readNextTasks(function (err, task) {
  console.log(task);
});

// close the connection
dbconn.close();
