var assert = require("assert");
var chai = require("chai");
var expect = chai.expect;
var gearsloth = require('../lib/gearsloth');
describe('Array', function(){
  var at = 'a';
  var func_name = 'b';
  var payload = new Buffer('c', 'utf8');
  var testBuffer = new Buffer('a\0b\0c', 'utf8');
  setup(function(){
  });
  suite('encodeTask()', function(){
    test('should return buffer with null byte delimiters', function(){
      expect(gearsloth.encodeTask(at, func_name, payload))
      .to.deep.equal(testBuffer);
    });
    test('should not fail with payload containing null bytes', function(){
      var payload = new Buffer('c\0d', 'utf8');
      var testBuffer = new Buffer('a\0b\0c\0d', 'utf8');
      expect(gearsloth.encodeTask(at, func_name, payload))
      .to.deep.equal(testBuffer);
    });
//    test('should throw an error on unorthodox input', function(){
//      a
  });
  suite('decodeTask()', function(){
    test('should return correct JSON object', function(){
      var shouldBe = {at:at,
        func_name:func_name,
        payload:payload};
      expect(gearsloth.decodeTask(testBuffer))
      .to.deep.equal(shouldBe);
    });
  });
});
