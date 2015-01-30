var util = require('util');
var log = require('../log');

function Daemon(conf) {
  this._components = [];
}

Daemon.prototype.initialize = function(conf) {
  if (conf.verbose) log.verbosity(conf.verbose);
  log.debug('gearslothd', 'config parsed:\n', util.inspect(conf));

  if (conf.injector)   this.add('./injector', conf);
  if (conf.runner)     this.add('./runner', conf);
  if (conf.controller) this.add(conf.controllerpath, conf);
  if (conf.ejector)    this.add('./ejector', conf);
};

Daemon.prototype.add = function(path, conf) {
  var $ = this;
  var component = require(path)(conf);
  var id = this._components.length;

  this._components.push({
    component: component,
    connected: false
  });

  if (component.on) {
    log.info('registering events:', component.component_name);

    component.on('connect', function() {
      $.setState(id, true);
    });
    component.on('disconnect', function() {
      $.setState(id, false);
      $._components = $._components.filter(function(component) {
        if (component.connected) return true;
        component.component = null;
        setTimeout(function() { $.add(path, conf); }, 1000);
        return false;
      }, $);
    });
  }
};

Daemon.prototype.setState = function(id, state) {
  var prev = this.allConnected();
  this._components[id].connected = state;
  var next = this.allConnected();

  if (prev && !next) {
    log.info('gearslothd', 'disconnected');
  }
  else if (!prev && next) {
    log.info('gearslothd', 'connected');
  }
};

Daemon.prototype.allConnected = function() {
  return this._components.reduce(function(acc, component) {
    return acc && component.connected;
  }, true);
};

module.exports = new Daemon();
