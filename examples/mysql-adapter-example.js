var log = require('../lib/log');
var db  = require('../lib/adapters/mysql');

var conf = {
  host:     '10.0.0.93',
  port:     '3306',
  database: 'gearsloth',
  user:     'gearsloth',
  password: 'gearpass'
};

db.initialize(conf, afterInit);

function afterInit(err, dbconn) {
  if (err) {
    log.debug("<<ERR>>", err);
    return;
  }

  var example_task = {
    at:         new Date().toISOString(),
    func_name:  'do_' + Math.random().toString().substr(2, 4),
    payload:    'kittens_' + Date.now().toString(),
    controller: 'normal',
    options: {
      retry: true,
      times: 3
    }
  };

  log.debug("<<DBCONN>>");

  dbconn.saveTask(example_task, function(err) {
    if (err) log.debug("[[[ ERR ]]]", err);
  });

  var stop = dbconn.listenTask(function (err, task) {
    if (err) {
      log.debug("<<ERR>>", err);
      return;
    }

    stop();

    log.debug("listenTask(): received:", task);
  });
}
