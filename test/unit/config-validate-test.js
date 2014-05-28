var assert = require('assert');
var util = require('util');
var validate = require('../../lib/config/validate');
var shouldThrow = require('./should-throw');

suite('validate', function() {
  suite('bool()', function() {
    function boolCmp(a, b) {
      test('bool(' + util.inspect(a) + ') should produce ' + util.inspect(b),
        function() {
        if (validate.bool(a) !== b)
          throw new Error('Values not equal');
      });
    }
    function boolThrow(arg) {
      test(util.inspect(arg) + ' should throw', function() {
        shouldThrow(function() {
          validate.bool(arg);
        });
      });
    }

    // valid booleans

    [[true, true], [false, false], ['true', true], ['false', false]].
    forEach(function(arr) {
      boolCmp(arr[0], arr[1]);
    });

    // invalid booleans

    [{}, 'asdf', '', undefined, 0, 1, [], new Date(), /a/, 'tru', 'falsee'].
    forEach(boolThrow);
  });

  // valid servers
  var valid_servers = [
    [undefined,                           { host: 'localhost', port: 4730 }],
    [{},                                  { host: 'localhost', port: 4730 }],
    [{ host: 'meetin.gs' },               { host: 'meetin.gs', port: 4730 }],
    [{ port: 4731 },                      { host: 'localhost', port: 4731 }],
    [{ port: '4731' },                    { host: 'localhost', port: 4731 }],
    [{ host: 'meetin.gs', port: 4731 },   { host: 'meetin.gs', port: 4731 }],
    [{ host: 'meetin.gs', port: '4731' }, { host: 'meetin.gs', port: 4731 }],
    [{ foo: 'bar' },          { foo: 'bar', host: 'localhost', port: 4730 }],
    [{ port: 4731, foo: 'b'},   { foo: 'b', host: 'localhost', port: 4731 }]
  ];

  suite('server()', function() {
    valid_servers.
    forEach(function(t) {
      test('server(' + util.inspect(t[0]) + ') should produce ' +
        util.inspect(t[1]), function() {
        assert.deepEqual(validate.server(t[0]), t[1]);
      });
    });

    // invalid servers
    // should it fail when called with an array?
    [ 'asdf', 0, 1, { host: 123 }, { port: 0 }, { port: 99999 },
      { port: '0' }, { port: '99999' } ].
    forEach(function(t) {
      test('server(' + util.inspect(t) + ') should throw', function() {
        shouldThrow(function() {
          validate.server(t);
        });
      });
    });
  });
  suite('servers()', function() {

    // valid server lists
    var server_list = valid_servers.map(function(t) { return t[0]; });
    var list_ret = valid_servers.map(function(t) { return t[1]; });

    test('valid server list', function() {
      assert.deepEqual(validate.servers(server_list), list_ret);
    });

    test('single server is valid server list', function() {
      assert.deepEqual(validate.servers({ port: 4731 }), [{
        host: 'localhost',
        port: 4731
      }]);
    });

    // invalid server lists
    [ [{}, 0], [{host:'localhost'}, {port: 99999}]].
    forEach(function(list) {
      test('invalid server list', function() {
        shouldThrow(function() {
          validate.servers(list);
        });
      });
    });
  });
  suite('conf()', function() {
    // valid confs
    [[{}, {}], [{
      injector: true
    }, {
      injector: true
    }], [{
      injector: false,
      controller: 'true'
    }, {
      injector: false,
      controller: true
    }], [{
      db: 'sqlite',
      dbopt: { foo: 'bar' },
      servers: {
        host: 'meetin.gs'
      }
    }, {
      db: 'sqlite',
      dbopt: { foo: 'bar' },
      servers: [{
        host: 'meetin.gs', port: 4730
      }]
    }]
    ].
    forEach(function(t) {
      test('conf(' + util.inspect(t[0]) + ') should produce ' +
        util.inspect(t[1]), function() {
        assert.deepEqual(validate.conf(t[0]), t[1]);
      });
    });
    // invalid confs
    [{controller: 'both'}, {ejector: 0}, {servers: [1]}].
    forEach(function(c) {
      test('conf(' + util.inspect(c) + ') should throw', function() {
        shouldThrow(function() {
          validate.conf(c);
        });
      });
    });
  });
})
