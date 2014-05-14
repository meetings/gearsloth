var assert = require("assert");
var gearsloth = require('../lib/gearsloth');
describe('Array', function(){
  var at = 'a';
  var func_name = 'a';
  var payload = new Buffer('k', 'utf8');
  setup(function(){
  });
  describe('#encodeTask()', function(){
    test('should return buffer with null byte delimiters', function(){
      var testBuffer = new Buffer('a\0a\0k', 'utf8');
      assert.deepEqual(testBuffer, gearsloth.encodeTask(at, func_name, payload));
    });
  });    
  describe('#encodeTask()', function(){
    test('should not fail with payload containing null bytes', function(){
      payload = new Buffer('k\0k', 'utf8');
      var testBuffer = new Buffer('a\0a\0k\0k', 'utf8');
      assert.deepEqual(testBuffer, gearsloth.encodeTask(at, func_name, payload));
    });
  });
});
