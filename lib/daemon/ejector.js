var gearman = require('gearman-coffee');
var gearsloth = require('../gearsloth');
var logger = require('../log');

function initialize(conf) {
  return new Ejector(
    function(workHandler) {
      return new gearman.Worker('delayedJobDone', workHandler);
    },
    conf.dbconn);
}

function Ejector(worker, adapter) {
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
