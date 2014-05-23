var chai = require("chai");
var gearsloth = require('../../lib/gearsloth');

require('../../lib/log').setOutput({
  error: function() {},
  print: function() {}
});

var expect = chai.expect;

suite('Gearsloth', function() {
  var at = new Date('2014-05-15T13:05:21.612Z');
  var at_str = at.toISOString();
  var func_name = 'b';
  var payload = new Buffer('c');
  var testBuffer = new Buffer(at_str + '\0b\0c');
  var testJSON = {
    at: at,
    func_name: new Buffer(func_name),
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
    test('should raise an error on invalid date parameter', function() {
      var fn = gearsloth.encodeTask.bind(
        undefined,
        "invalid date string",
        func_name,
        payload
      );

      expect(fn).to.throw('invalid date');
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
    test('should throw an error when task contains one null byte', function() {
      var testBuffer = new Buffer(at_str + '\0a');
      expect(function() {
        gearsloth.decodeTask(testBuffer)
      }).to.throw(Error);
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
      .to.be.undefined;
    });
  });
  // ENTER JSON DECODE
  suite('decodeJsonTask()', function() {
    var payload_string = 'payload';
    var test_json_string = {
      at: at,
      func_name: func_name,
      payload: payload_string
    };
    var test_buffer = new Buffer(JSON.stringify(test_json_string));
    var decoded = gearsloth.decodeJsonTask(test_buffer);
    test('should decode a task with no encoding specified', function() {
      expect(decoded)
        .to.have.property('at');
      expect(decoded.at.getTime()).to.equal(at.getTime());
      expect(decoded.func_name).to.equal(func_name);
      expect(decoded.payload).to.equal(payload_string);
    });
    test('should throw if at is missing', function() {
      var test_json_only_worker = {
        func_name: func_name
      };
      expect(function() {
        putJsonThroughDecodeJsonTask(test_json_only_worker);
      }).to.throw(Error);
    });
    test('should throw if func_name is missing', function() {
      var test_json_only_at = {
        at: at
      };
      expect(function() {
        putJsonThroughDecodeJsonTask(test_json_only_at);
      }).to.throw(Error);
    });
    test('should throw if task contains a null byte but no payload_after_null_byte', function() {
      expect(function() {
        gearsloth.decodeJsonTask(
          new Buffer(JSON.stringify(test_json_string) + "\0" + 'jeesus'));
      }).to.throw(Error);
    });
    test('should return everything after null byte as payload if payload_after_null_byte was set', function() {
      var test_buffer = new Buffer(100);
      var test_json = {
        at:new Date(),
        func_name:'jesse',
        payload_after_null_byte: true
      };
      var decoded = gearsloth.decodeJsonTask(
          Buffer.concat([new Buffer(JSON.stringify(test_json) + "\0"), 
          test_buffer]));
      expect(buffersEqual(test_buffer, decoded.payload)).to.be.true;
    });
    test('should throw if null byte was received and payload_after_null_byte was not set', function() {
      expect(function() {
        gearsloth.decodeJsonTask(
          new Buffer(JSON.stringify(test_json_string) + "\0" + 'jeesus'))
      }).to.throw(Error);
    });
    test('should overwrite existing payload if payload_after_null_byte was set', function() {
      var test_buffer = new Buffer(20);
      var test_json = {
        at:new Date(),
        func_name:'jesse',
        payload:'jumal x10 lavis',
        payload_after_null_byte: true
      };
      var decoded = gearsloth.decodeJsonTask(
          Buffer.concat([new Buffer(JSON.stringify(test_json) + "\0"), 
          test_buffer]));
    expect(buffersEqual(test_buffer, decoded.payload)).to.be.true;
    });
    test('should work with null byte in json', function() {
      var test_buffer = new Buffer(20);
      var test_json = {
        at:new Date(),
        func_name:'jesse',
        random_data: new Buffer(20),
        payload_after_null_byte: true
      };
      var decoded = gearsloth.decodeJsonTask(
          Buffer.concat([new Buffer(JSON.stringify(test_json) + "\0"), 
          test_buffer]));
    expect(buffersEqual(test_buffer, decoded.payload)).to.be.true;
    });
    test('should throw if task not buffer nor string', function() {
      expect(function() {
        gearsloth.decodeJsonTask(1);
      }).to.throw(Error);
    });
    test('should throw if JSON is invalid', function() {
      expect(function() {
        gearsloth.decodeJsonTask("{hesburger}");
      }).to.throw(Error);
    });
    test('should throw if date is invalid', function() {
      test_json = {
        at: 'huomenna klo 26',
        func_name: 'kuolema'
      };
      expect(function() {
        gearsloth.decodeJsonTask(test_json);
      }).to.throw(Error);
    });
  });

  suite('encodeWithBinaryPayload()', function() {
    var payload = new Buffer(10);
    var test_json = {
      at: at,
      func_name: func_name,
    };
    test('should return a buffer with a null byte', function() {
      expect(has(gearsloth.encodeWithBinaryPayload(test_json, payload), 0))
      .to.be.true;
    });
    test('should be decodable with decodeJsonTask()', function() {
      var decoded = gearsloth.decodeJsonTask(
        gearsloth.encodeWithBinaryPayload(test_json, payload));
      expect(decoded).to.have.property('at');
      expect(decoded).to.have.property('func_name', func_name);
      expect(decoded).to.have.property('payload');
      expect(buffersEqual(payload, decoded.payload)).to.be.true;
    });
    test('should work with stringified JSON', function() {
      expect(function() {
        gearsloth.decodeJsonTask(
          gearsloth.encodeWithBinaryPayload(JSON.stringify(test_json), payload))
      }).to.not.throw(Error);
    });
    test('should throw if JSON is malformed', function() {
      expect(function() {
          gearsloth.encodeWithBinaryPayload("hihihaaa", payload);
      }).to.throw(Error);
    });
  });
});

function putJsonThroughDecodeJsonTask(json) {
    var test_buffer = new Buffer(JSON.stringify(json));
    return gearsloth.decodeJsonTask(test_buffer);
}

function buffersEqual(buf1, buf2) {
  if(buf1.length !== buf2.length) {
    return false;
  }
  for(var i = 0; i < buf1.length; ++i) {
    if(buf1[i] !== buf2[i]) return false;
  }
  return true;
}

function has(buf, val) {
  for(var i = 0; i < buf.length; ++i) {
    if(buf[i] === val) return true;
  }
  return false;
}
