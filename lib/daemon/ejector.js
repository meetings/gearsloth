var lib = require('../helpers/lib_require');

var _         = require('underscore');
var async     = require('async');
var util      = require('util');
var component = lib.require('component');
var log       = lib.require('log');

function Ejector(conf) {
  async.waterfall([
    function(callback) {
      if (this._dbconn) {
        callback();
      }
      else {
        this.wait_for_first_emit('database_initialized', callback);
      }
    }.bind(this),

    function(callback) {
      this._dbconn.getDomains(callback);
    }.bind(this),

    function(domains, done) {
      var workers = [];
      domains.forEach(function(dom) {
        var gearman_func = 'gearsloth_eject-' + dom;
        log.info('registering gearman function', gearman_func);
        workers.push({
          func_name: gearman_func,
          func: function(payload, worker) {
            var task = JSON.parse(payload.toString());
            this.info('Received a task with id', task.id);
            this.eject(task, worker);
          }.bind(this)
        });
      }, this);
      this.registerGearman(conf.servers, { workers: workers });
      done();
    }.bind(this)
  ], function(error) {
    if (error) {
      this.err(error);
    }
  });

  component.Component.call(this, 'ejector', conf);
}

util.inherits(Ejector, component.Component);

Ejector.prototype.eject = function(task, worker) {
  var that = this;
  try {
    this._dbconn.completeTask(task, function(err) {
      if (err) {
        that.err('Error in database connection:', err.message);
        worker.error(err.message);
      } else {
        that.debug('Task ejected:', task);
        worker.complete();
      }
    });
  } catch (err) {
    this.err('Error:', err.message);
    this.disconnect();
  }
};

module.exports = function(conf) {
  return new Ejector(conf);
};

module.exports.Ejector = Ejector;
