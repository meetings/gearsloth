var Gearman = require('gearman-js').Gearman;

var worker = new Gearman('localhost', 4730);

worker.on('JOB_ASSIGN', function (job) {
    var result;
    var payload = job.payload.toString().replace('\n', '');
    console.log('worker: "' + job.func_name +
      '" job assigned to this worker with payload: "' + payload + '"');
    result = payload.split('').reverse().join('');
    worker.sendWorkComplete(job.handle, result + '\n');
    return worker.preSleep();
});

worker.on('NOOP', function () {
    return worker.grabJob();
});

worker.connect(function () {
    worker.addFunction('reverse');
    return worker.preSleep();
});
