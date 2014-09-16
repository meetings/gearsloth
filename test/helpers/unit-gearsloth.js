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

    ].forEach( function(t) {
      testValidEncodeTask(t[0], t[1]);
    });

    // invalid tests
    test('should throw an error without the "func_name" field', function() {
      expect( function() {
        gearsloth.encodeTask({at: at, payload: 'lel'});
      }).to.throw(Error);
    })
  });

  suite('decodeTask()', function() {

    // invalid tests(s)
    test('should throw an error when the task is neither String nor Buffer', function() {
      expect( function() {
        gearsloth.decodeTask(1);
      }).to.throw(Error);
    })

    test('should throw an error when the task is not in json format', function() {
     expect( function() {
        gearsloth.decodeTask('( ͡° ͜ʖ ͡°)');
      }).to.throw(Error);
    })

    //valid test(s)

    var example_task_as_string = '{"func_name":"foo","payload":[0,255],"payload_base64":"AP4="}';

    test('should successfully parse a valid task entered as string', function() {
      expect( function() {
        gearsloth.decodeTask(example_task_as_string);
      }).to.not.throw(Error);
    })

    test('should return an object for a valid task entered as string', function() {
      expect( function() {
        var this_should_be_an_object = gearsloth.decodeTask(example_task_as_string);
        if (typeof this_should_be_an_object !== 'object') {
          throw new Error('the decoder didn\'t return an object');
        };
      }).to.not.throw(Error);
    })

    test('returned object for a valid task (entered as string) should contain the right data in json format', function() {
      expect( function() {
        var this_should_be_json = gearsloth.decodeTask(example_task_as_string);
        if (
            this_should_be_json.func_name !== 'foo' ||
            this_should_be_json.payload_base64 !== 'AP4=' ||
            this_should_be_json.payload[0] !== 0 ||
            this_should_be_json.payload[1] !== 254
            ) {
          throw new Error('the returned object doesn\'t contain the right data')
        };
      }).to.not.throw(Error);
    })

  });
});
