var util = require('util');
var component = require('../component');

/**
 * Ejector component. Emits 'connect' when at least one server is connected.
 */

function Ejector(conf) {
  component.Component.call(this, 'ejector', conf);
  this._dbconn.getDomains( function( error, domains ) {
    var workers = [];
    domains.forEach( function( domain ) {
      workers.push( {
          func_name: 'gearsloth_eject-' + domain,
          func: function(payload, worker) {
            var task = JSON.parse(payload.toString());
            this._info('Received a task with id', task.id );
            this.eject(task, worker);
          }.bind(this)
      } );
    }, this );
    this.registerGearman( conf.servers, { workers : workers } );
  }.bind( this ));
}

util.inherits(Ejector, component.Component);

Ejector.prototype.eject = function(task, worker) {
  var that = this;
  try {
    this._dbconn.completeTask(task, function(err) {
      if (err) {
        that._err('Error in database connection:', err.message);
        worker.error(err.message);
      } else {
        that._debug('Task ejected:', task);
        worker.complete();
      }
    });
  } catch (err) {
    this._err('Error:', err.message);
    this.disconnect();
  }
}

module.exports = function(conf) {
  return new Ejector(conf);
};
module.exports.Ejector = Ejector;
