var db = require('../lib/adapters/sqlite');

// initialize with a handle into a regular file, empty for in-memory
db.initialize("DelayedTasks.sqlite", afterInit);

function afterInit(err, dbconn) {

  if (err) console.log(err);

  var stop = dbconn.listenTask(function (err, task_id) {
      if (err) console.log(err);
      stop();
      dbconn.grabTask(task_id, function(task) {
        console.log(task);
      });
  });
	
	var example_task = {
	  at: new Date(),
	  func_name: 'log',
	  payload: 'kittehs',
	  strategy:'special',
	  strategy_options:{
	    retry:true,
	    times:3
	  }
	};

  dbconn.saveTask(example_task, function() {});
}
