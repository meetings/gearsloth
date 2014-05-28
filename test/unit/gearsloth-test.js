var util = require('util');
var assert = require('assert');
var chai = require('chai');
var gearsloth = require('../../lib/gearsloth');

var expect = chai.expect;

suite('gearsloth', function() {
  suite('encodeTask()', function() {

    function testValidEncodeTask(task, str) {
      test('encodeTask(' + util.inspect(task) + ') should produce "' +
        str + '"', function() {
        assert.equal(gearsloth.encodeTask(task), str);
      });
    }

    // valid tasks
    var at = new Date('2014-05-15T13:05:21.612Z');
    [

      [
        { at: at, func_name: 'foo', payload: 'bar' },
        '{"at":"2014-05-15T13:05:21.612Z","func_name":"foo","payload":"bar"}'
      ],

      [
        { func_name: 'foo', payload: 'bar' },
        '{"func_name":"foo","payload":"bar"}'
      ],

      [
        { func_name: new Buffer([0, 255]) },
        '{"func_name_base64":"AP8="}'],
      [
        { func_name: 'foo', payload: new Buffer([0, 255]) },
        '{"func_name":"foo","payload_base64":"AP8="}'
      ],
      [
        { func_name: 'foo', payload: new Buffer([0, 255]), payload_base64: 'AP4=' },
        '{"func_name":"foo","payload":[0,255],"payload_base64":"AP4="}'
      ],
      [
        { func_name: 'foo', payload: 'bar', payload_base64: 'AP4=' },
        '{"func_name":"foo","payload":"bar","payload_base64":"AP4="}'
      ],
      [
        { func_name: new Buffer([0, 255]), func_name_base64: 'AP4=' },
        '{"func_name":[0,255],"func_name_base64":"AP4="}'
      ],
      [
        { func_name: 'bar', func_name_base64: 'AP4=' },
        '{"func_name":"bar","func_name_base64":"AP4="}'
      ]

    ].forEach(function(t) {
      testValidEncodeTask(t[0], t[1]);
    });

    // invalid tests
    test('should throw without func_name field', function() {
      expect(function() {
        gearsloth.encodeTask({at: at, payload: 'lel'});
      }).to.throw(Error);
    })
  });

  // TODO suite for decodeTask
});
