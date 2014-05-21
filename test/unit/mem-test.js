var chai = require('chai');
var memadapter = require('../../lib/adapters/mem');
var MemAdapter = memadapter.MemAdapter

describe('MemAdapter', function() {

  suite('construct', function() {
    test('can construct MemAdapter', function() {
      var adapter = new MemAdapter();
    });
  });
});