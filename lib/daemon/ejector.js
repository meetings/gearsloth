var MultiserverWorker = require('../gearman/multiserver-worker').MultiserverWorker;
var gearsloth = require('../gearsloth');
var logger = require('../log');

function initialize(conf) {
  var e = new Ejector(conf.dbconn);

// USE WITH SINGLESERVER SETUP
//  e._worker = new gearman.Worker('delayedJobDone', e.workHandler.bind(e));

  e._worker = new MultiserverWorker(
      conf.servers,
      'delayedJobDone',
      e.workHandler.bind(e));
}

function Ejector(adapter, worker) {
  if(worker)
    this._worker = worker(this.workHandler);
  this._adapter = adapter;
}

Ejector.prototype.workHandler = function(payload, worker) {
  var _this = this;
  var task = JSON.parse(payload.toString());
  _this._adapter.completeTask(task, function(err) {
    if(err) worker.error(err);
    else worker.complete();
  });
}

module.exports = initialize;
module.exports.Ejector = Ejector;
