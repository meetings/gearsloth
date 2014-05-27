var gearman = require('gearman-coffee');

function initialize() {
  return new Passthrough(
    function(workHandler) {
      return new gearman.Worker('passthroughController', workHandler);
    },
    new gearman.Client());
}

function Passthrough(worker, client) {
  this._worker = worker(this.workHandler);
  this._client = client;
}

Passthrough.prototype._runTask = function(task) {
  var _this = this;
  this._client.submitJob(task.func_name, task.payload)
    .on('complete', function() {
      _this._client.submitJob('delayedJobDone', task); 
    })
    .on('fail', function() {
    });
};

Passthrough.prototype.workHandler = function(payload, worker) {
  var _this = this;
  worker.complete(); // calling complete already so that the runner
                     // doesn't potentially offer work to other controllers

  _this._runTask(payload);
};

module.exports.Passthrough = Passthrough;
module.exports.initialize = initialize;
