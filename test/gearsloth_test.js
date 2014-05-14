var assert = require("assert");
var gearsloth = require('../lib/gearsloth');
describe('Array', function(){
  var at = 'a';
  var func_name = 'b';
  var payload = new Buffer('c', 'utf8');
  var testBuffer = new Buffer('a\0b\0c', 'utf8');
  setup(function(){
  });
  describe('#encodeTask()', function(){
    test('should return buffer with null byte delimiters', function(){
      assert.deepEqual(testBuffer, gearsloth.encodeTask(at, func_name, payload));
    });
  });    
  describe('#encodeTask()', function(){
    test('should not fail with payload containing null bytes', function(){
      var payload = new Buffer('c\0d', 'utf8');
      var testBuffer = new Buffer('a\0b\0c\0d', 'utf8');
      assert.deepEqual(testBuffer, gearsloth.encodeTask(at, func_name, payload));
    });
  });

  describe('#decodeTask()', function(){
    test('should return correct JSON object', function(){
      var shouldBe = {at:at,
        func_name:func_name,
        payload:payload};
      assert.deepEqual(shouldBe, gearsloth.decodeTask(testBuffer));
    });
  });
});
