var path = require('path');

exports.require = function(lib) {
  return require(path.join(__dirname, '..', lib));
};
