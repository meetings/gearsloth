var log = require('../lib/log');
var db = require('../lib/adapters/sqlite');
var config = {
  db_opt:{
    db_name:"DelayedTasks.sqlite",
    table_name:"DelayedTasks",
    poll_timeout:1000
  }
};

// initialize with a handle into a regular file, empty for in-memory
db.initialize(config, afterInit);

function afterInit(err, dbconn) {

  if (err) {
    log.debug('sqlite-example', err);
    return;
  }

  var example_task = {
    // at: new Date(),
    after: 0,
    func_name: 'log',
    payload: 'kittehs',
    controller:'special',
    strategy_options:{
      retry:true,
      times:3
    }
  };

  dbconn.saveTask(example_task, function(err) {
  log.debug('sqlite-example', 'Error:', err.message);
    log.debug('sqlite-example', "Task saved: " + new Date());
  });

  var stop = dbconn.listenTask(function (err, task) {
      if (err) {
        log.debug('sqlite-example', err);
        return;
      }

      log.debug('sqlite-example', "Recieved task:");
      console.log(task);
      console.log(new Date());
      dbconn.completeTask(task, function () {} );
      stop(afterRun);
  });

  function afterRun() {
    console.log("Listening stopped.");
  }
}
