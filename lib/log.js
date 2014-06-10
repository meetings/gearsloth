var util = require('util');

var out = {
  console: console
};

var verbose = 0;

function nop() {}

module.exports = {
  err: err,
  info: info,
  debug: debug,
  setOutput: function(c) {
    if (c)
      out.console = c;
    else
      out.console = {
        log: nop,
        error: nop
      };
  },
  setVerbose: function(v) {
    verbose = v;
  }
};

function timestamp() {
  return '[' + new Date().toISOString() + ']';
}

function log(stream) {
  return function() {
    stream
      //.bind(undefined, timestamp())
      .apply(undefined, arguments);
  }
}

function err() {
  log(out.console.error).apply(undefined, arguments);
}

function info() {
  if (verbose > 0)
    log(out.console.log).apply(undefined, arguments);
}

function debug() {
  var arr = Array.prototype.slice.call(arguments);
  log(out.console.error).apply(null, arr.map(explode));
}

function explode(arg) {
  return util.inspect(arg, { showHidden: true, depth: 2 }) + '\n';
}
