var lib = require('../helpers/lib_require');

var _         = require('underscore');
var async     = require('async');
var util      = require('util');
var component = lib.require('component');

function Ejector(conf) {
  component.Component.call(this, 'ejector', conf);

  async.waterfall([
    function wait_for_database(callback) {
      if (this._dbconn) {
        callback();
      }
      else {
        this.wait_for_first_emit('database_initialized', callback);
      }
    }.bind(this),

    function get_domains(callback) {
      this._dbconn.getDomains(callback);
    }.bind(this),

    function(domains, done) {
      var workers = [];

      domains.forEach(function(d) {
        var ejectf = 'gearsloth_eject_' + d;
        this.info('registering gearman function', ejectf);

        workers.push({
          func_name: ejectf,
          func: function(payload, worker) {
            var task = null;
            try {
              task = JSON.parse(payload.toString());
            }
            catch (err) {
              this.err('critical: could not parse payload', err);
              return;
            }
            this.info('received a task with id', task.id);
            this.eject(task, worker);
          }.bind(this)
        });
      }, this);

      this.registerGearman(conf.servers, { workers: workers });
      done();
    }.bind(this)
  ],
  function(error) {
    if (error) {
      this.err('failed to initialize', error);
    }
  });
}

util.inherits(Ejector, component.Component);

Ejector.prototype.eject = function(task, worker) {
  var that = this;
  this._dbconn.completeTask(task, function(err, id) {
    if (err) {
      that.err('task not purged', err.message);
      that.debug(task);
      worker.error(err.message);
    }
    else {
      that.info('task ejected with id', id);
      that.debug(task);
      worker.complete();
    }
  });
};

module.exports = function(conf) {
  return new Ejector(conf);
};

module.exports.Ejector = Ejector;
