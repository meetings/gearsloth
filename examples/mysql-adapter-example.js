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

function afterInit(err, database) {
  if (err) {
    log.debug("<<ERR>>", err);
    return;
  }

  var example_task = {
    at:         new Date().toISOString(),
    after:      12345,
    func_name:  'do_' + Math.random().toString().substr(2, 4),
    payload:    'kittens',
    controller: 'normal',
    options: {
      retry: true
    }
  };

  database.saveTask(example_task, function(err, task) {
    if (err) log.debug('[[[ ERR ]]]', err);
    log.debug('saveTask: saved::', task);
  });

  database.completeTask({}, function(err, task) {
    if (err) log.debug('[[[ ERR ]]]', err);
    log.debug('completeTask', 'deleted::', task);
  });

  var stop = database.listenTask(function (err, task) {
    if (err) {
      log.debug('[[[ ERR ]]]', err);
      return;
    }

    stop();

    log.debug("listenTask()", "Received:", task);
  });
}
