// require the db adapter
var db = require('../lib/adapters/sqlite');

// initialize with a handle into a regular file, empty for in-memory
db.initialize("DelayedTasks.sqlite", afterInit );

function afterInit(err, dbconn) {

  if (err) console.log(err);

	var stop = dbconn.listenTask(function (err, task) {
	    if (err) console.log(err);
  		console.log(task);
      stop();
	});
	
	var example_task = {
	  at: new Date(),
	  func_name: 'log',
	  payload: 'kittehs'
	}

	dbconn.saveTask(example_task, function() {});
	
	
}





// check what is the status of the database connection
// console.log(dbconn);

// save a task with current date
// dbconn.saveTask(new Date(), 'log', 'kittehs');

// read all expired tasks from db and print them
// dbconn.readNextTasks(function (err, task) {
//   console.log(task);
// });

// close the connection
// dbconn.close();
