var util = require('util');
var config = require('../../lib/config');
var log = require('../../lib/log');
var chai = require('chai');
var expect = chai.expect;

var nop = function() {};
var ok_json = './test/unit/ok.json';
var crap_json = './test/unit/crap.json';

function args(argv) {
  return ['node', 'gearslothd.js'].concat(argv);
}

suite('config', function() {
  suite('initialize()', function() {
    function testThrow(msg, argv) {
      test(msg, function() {
        expect(function() {
          config.initialize(args(argv));
        }).to.throw(Error);
      });
    }
    function testConf(msg, argv, key, val) {
      test(msg, function() {
        var conf = config.initialize(args(argv));
        if (conf[key] !== val)
          throw new Error(conf[key] + ' !== ' + val);
      });
    }
    function testServ(msg, argv, serv) {
      test(msg, function() {
        var conf = config.initialize(args(argv));
        if (!(conf.servers[0].host === serv.host &&
              conf.servers[0].port === serv.port))
        throw new Error(util.inspect(conf.servers[0]) + ' !== ' +
          util.inspect(serv));
      });
    }
    function testHelp(msg, argv) {
      test(msg, function(done) {
        config.setLog(function(msg) {
          if (msg === config.helpString(args(argv)))
            done();
          else
            done(new Error('Unexpected help string'));
        });
        config.initialize(args(argv));
        config.setLog(console.log);
      });
    }
    function testdbopt(msg, argv, key, val) {
      test(msg, function() {
        var conf = config.initialize(args(argv));
        if (conf.dbopt[key] !== val)
          throw new Error(conf.dbopt[key] + ' !== ' + val);
      });
    }

    // legal configuration options
    testHelp('should return help string with -h',
      [ '-h' ]);
    testHelp('should return help string with -irceh',
      [ '-irceh' ]);
    testHelp('should return help string with --help',
      [ '--help' ]);
    testHelp('should return help string with --injector --help',
      [ '--injector', '--help' ]);
    testConf('should set injector with -ir',
      [ '-ir' ], 'injector', true);
    testConf('should set runner with -ir',
      [ '-ir' ], 'runner', true);
    testConf('should set injector with -i -r',
      [ '-i', '-r' ], 'injector', true);
    testConf('should set runner with -i -r',
      [ '-i', '-r' ], 'runner', true);
    testConf('should set injector with --injector --runner',
      [ '--injector', '--runner' ], 'injector', true);
    testConf('should set runner with --injector --runner',
      [ '--injector', '--runner' ], 'runner', true);
    testConf('should set runner=true with -f ok.json -ri',
      [ '-f', ok_json, '-ri' ], 'runner', true);
    testServ('should set server list with --file=ok.json',
      [ '-ri', '--file=' + ok_json ],
      { host: 'localhost', port: 4830 });
    testServ('should override server list with --file=ok.json asdf:1234',
      [ '-ri', '--file=' + ok_json, 'asdf:1234' ],
      { host: 'asdf', port: 1234 });
    testServ('should override server list with --file=ok.json --servers=...',
      [ '-ri', '--file=' + ok_json,
      '--servers=[{"host":"asdf","port":"1234"}]' ],
      { host: 'asdf', port: 1234 });
    testServ('should override server list with --file=ok.json --servers=... ' +
        'with numerical port values',
      [ '-ri', '--file=' + ok_json,
      '--servers=[{"host":"asdf","port":1234}]' ],
      { host: 'asdf', port: 1234 });
    testServ('should set default server',
      [], { host: 'localhost', port: 4730 });
    testServ('should set default port if not set',
      [ 'asdf' ], { host: 'asdf', port: 4730 });
    testServ('should set default port if not set with colon',
      [ 'asdf:' ], { host: 'asdf', port: 4730 });
    testServ('should set default host if not set',
      [ ':1234' ], { host: 'localhost', port: 1234 });
    testdbopt('should read dbopt',
      [ '-rif', ok_json ], 'there', 'could');
    testdbopt('should override dbopt',
      [ '-rif', ok_json, '--dbopt={"there":"foo"}' ], 'there', 'foo');
    testdbopt('should augment dbopt',
      [ '-rif', ok_json, '--dbopt={"foo":"bar"}' ], 'foo', 'bar');
    testServ('should override earlier options',
      [ '-f', crap_json, '-f', ok_json, '-ri' ],
      { host: 'localhost', 'port': 4830 });
    testServ('should override earlier options with posix style short args',
      [ '-frif', crap_json, ok_json ],
      { host: 'localhost', 'port': 4830 });
    testConf('should override with --conf',
      [ '-f', ok_json, '--conf={ "mode": "both" }' ], 'runner', true);

    // illegal configuration options
    testThrow('should throw on crap json conf after short opt',
      [ '-f', crap_json ]);
    testThrow('should throw on crap json conf after long opt',
      [ '--file='+crap_json ]);
    testThrow('should throw on nonexistent configuration file after short opt',
      [ '-f', 'foo' ]);
    testThrow('should throw on nonexistent configuration file after long opt',
      [ '--file=foo' ]);
    testThrow('should throw on nonexistent configuration file after multiple' +
      'short options',
      [ '-irf', 'foo' ]);
    testThrow('should throw on nonexistent overriding configuration file ' +
      'after multiple short options',
      [ '-ifrf', ok_json, 'foo' ]);
    testThrow('should throw on nonexistent overriding configuration file ' +
      'after multiple long options',
      [ '--file=' + ok_json, '--injector', '--file=foo' ]);
    testThrow('should throw on unrecognized option',
      [ '-b' ]);
    testThrow('should throw on unrecognized short option',
      [ '-ibr' ]);
    testThrow('should throw on unrecognized long option',
      [ '--foo' ]);
    testThrow('should throw on unrecognized long option after legal options',
      [ '--injector', '--foo' ]);
    testThrow('should throw on nonnumerical port',
      [ 'localhost:foo' ]);
    testThrow('should throw on nonnumerical port after options',
      [ '-ir', 'localhost:foo' ]);
    testThrow('should throw on illegal hostname/port',
      [ 'localhost:4730:foo' ]);
    testThrow('should throw on missing configuration file after short opt',
      [ '-f' ]);
    testThrow('should throw on missing configuration file after long opt',
      [ '--file' ]);
    testThrow('should throw on missing configuration file after long opt and ' +
      'equals sign', [ '--file=' ]);
    testThrow('should throw on missing json conf',
      [ '--conf' ]);
    testThrow('should throw on missing json conf plus equals sign',
      [ '--conf=' ]);
    testThrow('should throw on unparseable json conf',
      [ '--conf="{"' ]);
    testThrow('should throw on invalid json conf',
      [ '--conf=\'{ "mode": "buth" }\'' ]);
    testThrow('should throw on missing json dbopt',
      [ '--dbopt' ]);
    testThrow('should throw on missing json dbopt plus equals sign',
      [ '--dbopt=' ]);
    testThrow('should throw on unparseable dbopt',
      [ '--dbopt={' ]);
    testThrow('should throw on missing server list',
      [ '--servers' ]);
    testThrow('should throw on missing server list plus equals sign',
      [ '--servers=' ]);
    testThrow('should throw on unparseable server list',
      [ '--servers={' ]);
    testThrow('should throw on invalid server list',
      [ '--servers=[ { "host": "localhost", "port": "foo" } ]' ]);
  });
});
