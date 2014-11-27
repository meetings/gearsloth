/**
 * Returns a function that throws if given function `f` does *not* throw.
 *
 * @param {Function} f
 * @return {Function}
 */

module.exports = function(f) {
  try { f(); } catch (e) { return; } // ok
  throw new Error('Function f() should throw');
};
