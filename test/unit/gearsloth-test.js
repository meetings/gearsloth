var chai = require("chai");
var gearsloth = require('../../lib/gearsloth');

var expect = chai.expect;

describe('Gearsloth', function() {
  var at = new Date('2014-05-15T13:05:21.612Z');
  var at_str = at.toISOString();
  var func_name = 'b';
  var payload = new Buffer('c');
  var testBuffer = new Buffer(at_str + '\0b\0c');
  var testJSON = {
    at: at,
    func_name: func_name,
    payload: payload
  };
  suite('encodeTask()', function() {
    test('should return buffer with null byte delimiters', function() {
      expect(gearsloth.encodeTask(at, func_name, payload))
      .to.deep.equal(testBuffer);
    });
    test('should not fail with payload containing null bytes', function() {
      var payload = new Buffer('c\0d', 'utf8');
      var testBuffer = new Buffer(at_str + '\0b\0c\0d', 'utf8');
      expect(gearsloth.encodeTask(at, func_name, payload))
      .to.deep.equal(testBuffer);
    });
    test('should not fail with humongous payload', function() {
      var payload_length = 2048;
      var payload = new Buffer(payload_length);
      expect(gearsloth.encodeTask(at, func_name, payload))
      .to.have.length.within(payload_length, payload_length + 100);
    });
    test('should accept JSON object as a parameter', function() {
      expect(gearsloth.encodeTask(testJSON))
      .to.deep.equal(testBuffer);
    });
    test('should accept string as a payload', function() {
      var testBuffer = new Buffer(at_str + '\0b\0kisse');
      expect(gearsloth.encodeTask(at, func_name, 'kisse'))
      .to.deep.equal(testBuffer);
    });
    test('should accept date type parameter', function() {
      var date = new Date(2023);
      var testBuffer = new Buffer(date.toISOString()+'\0b\0c');
      expect(gearsloth.encodeTask(date, func_name, payload))
      .to.deep.equal(testBuffer);
    });
  });
  suite('decodeTask()', function() {
    test('should return correct JSON object', function() {
      expect(gearsloth.decodeTask(testBuffer))
      .to.deep.equal(testJSON);
    });
    test('should throw an error when task contains no null bytes', function() {
      var testBuffer = new Buffer(at_str);
      expect(function() {
        gearsloth.decodeTask(testBuffer)
      }).to.throw(Error);
    });
    test('should not throw an error when task contains one null byte', function() {
      var testBuffer = new Buffer(at_str + '\0a');
      expect(function() {
        gearsloth.decodeTask(testBuffer)
      }).to.not.throw(Error);
    });
    test('should not throw an error when func_name is zero length', function() {
      var testBuffer = new Buffer(at_str + '\0\0a');
      expect(function() {
        gearsloth.decodeTask(testBuffer)
      }).to.not.throw(Error);
    });
    test('should throw an error when task contains no at', function() {
      var testBuffer = new Buffer('\0a\0a');
      expect(function() {
        gearsloth.decodeTask(testBuffer)
      }).to.throw(Error);
    });
    test('should work with payload with zero length', function() {
      var testBuffer = new Buffer(at_str + '\0a\0');
      expect(gearsloth.decodeTask(testBuffer).payload)
      .to.have.length(0);
    });
  });
});