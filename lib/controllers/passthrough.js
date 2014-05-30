var MultiserverClient = require('../gearman/multiserver-client').MultiserverClient;
var MultiserverWorker = require('../gearman/multiserver-worker').MultiserverWorker;

function initialize(conf) {
  var p = new Passthrough(
      new MultiserverClient(conf.servers));
  p._worker = new MultiserverWorker(
      conf.servers,
      'passthroughController',
      p.workHandler.bind(p));
}

function Passthrough(client, worker) {
  if(worker)
    this._worker = worker(this.workHandler);
  this._client = client;
}

Passthrough.prototype._runTask = function(task) {
  var _this = this;
  this._client.submitJob(task.func_name, task.payload)
    .on('complete', function() {
      _this._client.submitJob('delayedJobDone', JSON.stringify(task)); 
    })
    .on('fail', function() {
    });
};

Passthrough.prototype.workHandler = function(payload, worker) {
  var _this = this;
  worker.complete(); // calling complete already so that the runner
                     // doesn't potentially offer work to other controllers

  var task = JSON.parse(payload.toString());
  _this._runTask(task);
};

module.exports = initialize;
module.exports.Passthrough = Passthrough;
