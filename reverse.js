var Worker = require('gearman-coffee').Worker;

var worker = new Worker('reverse', function(payload, worker) {
  var reversed = payload.toString("utf-8").split('').reverse().join('');
  return worker.complete(reversed);
});
