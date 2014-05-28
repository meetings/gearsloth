var gearman = require('gearman-coffee');

function initialize(conf) {
  var p = new Passthrough(new gearman.Client());
  p._worker = new gearman.Worker('passthroughController', p.workHandler.bind(p));
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
