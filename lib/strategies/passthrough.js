var gearman = require('gearman-coffee');

function initialize(adapter) {
  return new Passthrough(
    function(workHandler) {
      return new gearman.Worker('gearsloth-strategy-passthrough', workHandler);
    },
    new gearman.Client(),
    adapter);
}

function Passthrough(worker, client, adapter) {
  this._adapter = adapter;
  this._worker = worker(this.workHandler);
  this._client = client;
}

Passthrough.prototype._runTask = function(task) {
  var _this = this;
  this._client.submitJob(task.func_name, task.payload)
    .on('complete', function() {
      _this._adapter.updateTask(task.id, 'DONE');
    })
    .on('fail', function() {
      _this._adapter.updateTask(task.id, 'FAIL');
    });
};

Passthrough.prototype.workHandler = function(payload, worker) {
  var _this = this;
  this._adapter.grabTask(payload, function(err, task) {
    if(err) {
      return worker.error();
    }
    worker.complete(); // calling complete already so that the runner
                       // doesn't potentially offer work to other controllers

    _this._runTask(task);
  });
};

module.exports.Passthrough = Passthrough;
module.exports.initialize = initialize;
