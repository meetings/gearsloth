
var v = 0;
var util = require('util');

function stringify(obj) {
  return (typeof obj === 'string')? obj: util.inspect(obj);
}

function log(func, level, argv) {
  func.apply(
    undefined,
    [level].concat(
      Array.prototype.splice.call(argv, 0).map(stringify)
    )
  );
}

process.on('SIGUSR2', function() {
  v = 9;
  log(console.log, 'D:', 'SIGUSR2 caught, verbosity maximized');
});

module.exports = {
  err: function() {
    if (v >= -1) log(console.error, 'E!', arguments);
  },

  note: function() {
    if (v >= 0) log(console.log, 'N:', arguments);
  },

  info: function() {
    if (v >= 1) log(console.log, 'I:', arguments);
  },

  debug: function() {
    if (v >= 2) log(console.log, 'D:', arguments);
  },

  mute: function() {
    v = -9;
  },

  verbosity: function(vv) {
    v = vv;
    this.info('log: verbosity set to ' + v);
  }
};
