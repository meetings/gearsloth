var util = require('util');
var config = require('../../config');
var log = require('../../lib/log');
var chai = require('chai');
var expect = chai.expect;

var nop = function() {};
var ok_json = './test/unit/ok.json';
var crap_json = './test/unit/crap.json';

function args(argv) {
  return ['node', 'gearslothd.js'].concat(argv);
}

describe('config', function() {
  suite('initialize()', function() {
    function testThrow(msg, argv) {
      test(msg, function() {
        expect(function() {
          config.initialize(args(argv), nop);
        }).to.throw(Error);
      });
    }
    function testConf(msg, argv, key, val) {
      test(msg, function(done) {
        config.initialize(args(argv), function(err, conf) {
          if (conf[key] === val)
            done();
          else
            done(new Error(conf[key] + ' !== ' + val));
        });
      });
    }
    function testServ(msg, argv, serv) {
      test(msg, function(done) {
        config.initialize(args(argv), function(err, conf) {
          if (conf.servers[0].host === serv.host &&
              conf.servers[0].port === serv.port)
            done();
          else
            done(new Error(util.inspect(conf.servers[0]) + ' !== ' +
                util.inspect(serv)));
        });
      });
    }
    function testRet(msg, argv) {
      test(msg, function() {
        var ret = config.initialize(args(argv), nop);
        if (!(ret && ret.length > 0))
          throw new Error('Returned empty string or undefined');
      });
    }
    function testdbopt(msg, argv, key, val) {
      test(msg, function(done) {
        config.initialize(args(argv), function(err, conf) {
          if (conf.dbopt[key] === val)
            done();
          else
            done(new Error(conf.dbopt[key] + ' !== ' + val));
        });
      });
    }

    // legal configuration options
    testRet('should return help string with -h',
      [ '-h' ]);
    testRet('should return help string with -wrh',
      [ '-wrh' ]);
    testRet('should return help string with --help',
      [ '--help' ]);
    testRet('should return help string with --worker --help',
      [ '--worker', '--help' ]);
    testConf('should set worker with -wr',
      [ '-wr' ], 'worker', true);
    testConf('should set runner with -wr',
      [ '-wr' ], 'runner', true);
    testConf('should set worker with -w -r',
      [ '-w', '-r' ], 'worker', true);
    testConf('should set runner with -w -r',
      [ '-w', '-r' ], 'runner', true);
    testConf('should set worker with --worker --runner',
      [ '--worker', '--runner' ], 'worker', true);
    testConf('should set runner with --worker --runner',
      [ '--worker', '--runner' ], 'runner', true);
    testConf('should set runner=true with -f ok.json -rw',
      [ '-f', ok_json, '-rw' ], 'runner', true);
    testServ('should set server list with --file=ok.json',
      [ '-rw', '--file=' + ok_json ],
      { host: 'localhost', port: 4830 });
    testServ('should override server list with --file=ok.json asdf:1234',
      [ '-rw', '--file=' + ok_json, 'asdf:1234' ],
      { host: 'asdf', port: 1234 });
    testServ('should override server list with --file=ok.json --servers=...',
      [ '-rw', '--file=' + ok_json,
      '--servers=[{"host":"asdf","port":"1234"}]' ],
      { host: 'asdf', port: 1234 });
    testServ('should override server list with --file=ok.json --servers=... ' +
        'with numerical port values',
      [ '-rw', '--file=' + ok_json,
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
      [ '-rwf', ok_json ], 'there', 'could');
    testdbopt('should override dbopt',
      [ '-rwf', ok_json, '--dbopt={"there":"foo"}' ], 'there', 'foo');
    testdbopt('should augment dbopt',
      [ '-rwf', ok_json, '--dbopt={"foo":"bar"}' ], 'foo', 'bar');
    testServ('should override earlier options',
      [ '-f', crap_json, '-f', ok_json, '-rw' ],
      { host: 'localhost', 'port': 4830 });
    testServ('should override earlier options with posix style short args',
      [ '-frwf', crap_json, ok_json ],
      { host: 'localhost', 'port': 4830 });
    testConf('should override with --conf',
      [ '-f', ok_json, '--conf={ "mode": "both" }' ], 'runner', true);

    // illegal configuration options
    testThrow('should throw on -f ok.json with default mem adapter',
      [ '-f', ok_json ]);
    testThrow('should throw on -w with default mem adapter',
      [ '-w' ]);
    testThrow('should throw on -r with default mem adapter',
      [ '-r' ]);
    testThrow('should throw on --worker with default mem adapter',
      [ '--worker' ]);
    testThrow('should throw on --runner with default mem adapter',
      [ '--runner' ]);
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
      [ '-wrf', 'foo' ]);
    testThrow('should throw on nonexistent overriding configuration file ' +
      'after multiple short options',
      [ '-wfrf', ok_json, 'foo' ]);
    testThrow('should throw on nonexistent overriding configuration file ' +
      'after multiple long options',
      [ '--file=' + ok_json, '--worker', '--file=foo' ]);
    testThrow('should throw on unrecognized option',
      [ '-b' ]);
    testThrow('should throw on unrecognized short option',
      [ '-wbr' ]);
    testThrow('should throw on unrecognized long option',
      [ '--foo' ]);
    testThrow('should throw on unrecognized long option after legal options',
      [ '--worker', '--foo' ]);
    testThrow('should throw on nonnumerical port',
      [ 'localhost:foo' ]);
    testThrow('should throw on nonnumerical port after options',
      [ '-wr', 'localhost:foo' ]);
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
