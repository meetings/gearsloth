var Worker = require('gearman-coffee').Worker;

var worker = new Worker('log', function(payload, worker) {
  var str = payload.toString("utf-8");
  console.log('log:', str);
  return worker.complete();
});
