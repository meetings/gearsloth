var util = require('util');
var assert = require('assert');
var merge = require('../../lib/merge');

describe('merge', function() {
  suite('merge()', function() {

    // valid merges

    var valid = [
      [[],{}],
      [[{}],{}],
      [[{a:1}],{a:1}],
      [[{a:1},{b:2}],{a:1,b:2}],
      [[{a:1},{a:2}],{a:2}],
      [[{a:1,b:1},{b:2},{a:2}],{a:2,b:2}],
      [[{},{a:1},{a:2}],{a:2}]
    ];

    valid.forEach(function(tst) {
      test('merge(' + util.inspect(tst[0]) + ') should produce ' +
          util.inspect(tst[1]),
        function() {
        assert.deepEqual(merge(tst[0]), tst[1]);
      });
      test('merge(' + tst[0].map(function(t) {
          return util.inspect(t);
        }).join(', ') + ') should produce ' + util.inspect(tst[1]),
        function() {
        assert.deepEqual(merge.apply(undefined, tst[0]), tst[1]);
      });
    });

    // invalid merges

    var invalid = [
      [1,2],
      [{a:1},2],
      [1,{a:1}]
    ];

    // yeah chai has this whatever
    function shouldThrow(f) {
      try { f(); } catch (e) { return; } // ok
      throw new Error('Should throw');
    }

    invalid.forEach(function(tst) {
      test('merge(' + util.inspect(tst) + ') should throw', function() {
        shouldThrow(function() {
          merge(tst);
        });
      });
      test('merge(' + tst.map(function(t) {
          return util.inspect(t);
        }).join(', ') + ') should throw', function() {
        shouldThrow(function() {
          merge.apply(undefined, tst);
        });
      });
    });
  });
});
