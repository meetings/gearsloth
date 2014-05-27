var log = require('../lib/log');
var db = require('../lib/adapters/sqlite');

// initialize with a handle into a regular file, empty for in-memory
db.initialize("DelayedTasks.sqlite", afterInit);

function afterInit(err, dbconn) {

  if (err) {
    log.debug(err);
    return;
  }
	
	var example_task = {
//	  at: new Date(),
	  after: 3,
	  func_name: 'log',
	  payload: 'kittehs',
	  controller:'special',
	  strategy_options:{
	    retry:true,
	    times:3
	  }
	};

  dbconn.saveTask(example_task, function() {
    log.debug("Task saved");
  });
  
  var stop = dbconn.listenTask(function (err, task) {
      if (err) {
        log.debug(err);
        return;
      }
      
      stop();
      log.debug("Recieved task:");
      console.log(task);
      dbconn.deleteTask(task.task_id, function () {} );
  });
}
