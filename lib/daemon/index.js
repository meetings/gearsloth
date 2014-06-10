var logger = require('../log');

function Daemon(conf) {
  this._components = [];
}

Daemon.prototype.initialize = function(conf) {
  if (conf.verbose)     logger.setVerbose(conf.verbose);
  if (conf.injector)    this.add('./injector',        conf);
  if (conf.runner)      this.add('./runner',          conf);
  if (conf.controller)  this.add(conf.controllerpath, conf);
  if (conf.ejector)     this.add('./ejector',         conf);
};

Daemon.prototype.add = function(path, conf) {
  var that = this;
  var component = require(path)(conf);
  var id = this._components.length;
  this._components.push({
    component: component,
    connected: false
  });
  if (!component.on)
    return;
  component.on('connect', function() {
    that.setConnected(id, true);
  });
};

Daemon.prototype.allConnected = function() {
  return this._components.reduce(function(acc, component) {
    return acc && component.connected;
  }, true);
};

Daemon.prototype.setConnected = function(id, connected) {
  var prev = this.allConnected();
  this._components[id].connected = connected;
  var next = this.allConnected();
  if (prev && !next)
    logger.info('gearslothd:', 'partially disconnected');
  else if (!prev && next)
    logger.info('gearslothd:', 'fully connected');
};

module.exports = new Daemon();
