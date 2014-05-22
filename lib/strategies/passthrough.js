

function Passthrough(gearman, adapter) {
  this._adapter = adapter;
  this._worker = new gearman.Worker('gearsloth-strategy-passthrough', this.workHandler);
  this._client = new gearman.Client();
}

Passthrough.prototype._runTask = function(task) {
  this._client.submitJob(task.func_name, task.payload);
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

module.exports = Passthrough;
