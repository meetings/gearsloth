var util = require('util');

var out = {
  console: console
};

var verbose = 0;

function nop() {}

module.exports = {
  err: err,
  info: info,
  notice: notice,
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
      .bind(undefined, timestamp())
      .apply(undefined, arguments);
  }
}

function logLevel(stream, level, args) {
  log(stream).bind(undefined, level).apply(undefined, args);
}

// err -> stderr
// notice -> stdout
// info -> stdout (with -v)
// debug -> stdout (with -vv)

function err() {
  logLevel(out.console.error, '(ERROR)', arguments);
}

function notice() {
  logLevel(out.console.log, '(NOTICE)', arguments);
}

function info() {
  if (verbose > 0)
    logLevel(out.console.log, '(INFO)', arguments);
}

function debug() {
  if (verbose > 1)
    logLevel(out.console.log, '(DEBUG)', arguments);
}
