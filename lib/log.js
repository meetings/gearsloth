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

function logWithProperFormatting(streamFunction, level, originalArguments) {
  // verbose 0 does not prefix logs with log level name
  var prefixTokens = (verbose > 0) ? [level] : [];

  // first element of originalArguments is treated as a
  // source component and is postfixed with a colon
  prefixTokens.push(originalArguments[0] + ':');

  streamFunction.apply(
    undefined, prefixTokens.concat(
      Array.prototype.splice.call(originalArguments, 1)
    )
  );
}

// err -> stderr
// notice -> stdout
// info -> stdout (with -v)
// debug -> stdout (with -vv)

function err() {
  logWithProperFormatting(out.console.error, '(ERROR)', arguments);
}

function notice() {
  logWithProperFormatting(out.console.log, '(NOTICE)', arguments);
}

function info() {
  if (verbose > 0)
    logWithProperFormatting(out.console.log, '(INFO)', arguments);
}

function debug() {
  if (verbose > 1)
    logWithProperFormatting(out.console.log, '(DEBUG)', arguments);
}
