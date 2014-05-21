function Passthrough(gearman) {
  this._worker = new gearman.Worker('gearsloth-strategy-passthrough', this.workHandler);
}

module.exports = Passthrough;