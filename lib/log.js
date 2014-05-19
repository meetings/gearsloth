var util = require('util');

module.exports = {
  err: err,
  info: info,
  debug: debug,
  setOutput: function(newUtil) {
    util = newUtil;
  }
};

function err(msg) {
  util.error(msg.toString(), '\n');
}

function info(msg) {
  util.print(msg, '\n');
}

function debug() {
  var arr = Array.prototype.slice.call(arguments);
  util.print.apply(null, arr.map(explode));
}

function explode(arg) {
  return util.inspect(arg, { showHidden: true, depth: 2 }) + '\n';
}
