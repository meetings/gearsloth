// An example code for 'injector'
var Worker = require('gearman-coffee').Worker;
var gearsloth = require('../lib/gearsloth');

var worker = new Worker('submitJobDelayed', function(payload, worker) {
  var task = gearsloth.decodeJsonTask(payload);

  // put it to database or whatevs, now we gon just print it
  console.log(task);
});
