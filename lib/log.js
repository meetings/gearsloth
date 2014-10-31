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

function logWithFormatting(streamFunction, level, originalArguments) {
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

/* Log levels:
 * err -> stderr
 * notice -> stdout
 * info -> stdout (with -v)
 * debug -> stdout (with -vv)
 */

function err() {
  logWithFormatting(out.console.error, 'E!', arguments);
}

function notice() {
  logWithFormatting(out.console.log, 'N:', arguments);
}

function info() {
  if (verbose > 0) logWithFormatting(out.console.log, 'I:', arguments);
}

function debug() {
  if (verbose > 1) logWithFormatting(out.console.log, 'D:', arguments);
}
