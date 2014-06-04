/**
 * Performs a shallow merge creating a new object from all the objects given as
 * arguments. Original objects are not modified.
 *
 * @param {[Object]|Object..} args objects to be merged
 * @return {Object} merged object
 */

module.exports = function(args) {
  return Array.prototype.reduce.call(Array.isArray(args) ? args : arguments,
      function(acc, arg) {
    Object.keys(arg).forEach(function(k) {
      acc[k] = arg[k];
    });
    return acc;
  }, {});
};
