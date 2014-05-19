var fs          = require('fs');
var yargs       = require('yargs');

function errorExit(msg) {
  console.error('gearslothd:', msg);
  process.exit(1);
}

function helpExit() {
  yargs.showHelp();
  process.exit(1);
}

// describe configuration options
yargs.
usage   ('Usage: $0').
alias   ('w', 'worker').
describe('w', 'Run as worker').
alias   ('r', 'runner').
describe('r', 'Run as runner').
alias   ('c', 'conf [filename]').
describe('c', 'Configuration file').
alias   ('h', 'help').
describe('a', 'Database adapter').
alias   ('a', 'adapter [name]').
describe('h', 'Show this help');

var argv = yargs.argv;

exports.initialize = function(callback) {

  // show help
  if (argv.h || argv.help) {
    helpExit();
  }

  // default configuration
  var conf = {
    mode: 'both',
    adapter: 'mem',
  };
  var conf_file = 'gearsloth.json';

  if (argv.c = argv.c || argv.conf) {
    conf_file = argv.c;
    if (!fs.existsSync(conf_file)) {
      errorExit('Configuration file does not exist');
    }
  } else if (!fs.existsSync(conf_file)) {
    conf_file = null;
  }

  // read and merge configuration
  if (conf_file) {
    try {
      var c = JSON.parse(fs.readFileSync(conf_file));
      Object.keys(c).forEach(function(k) {
        conf[k] = c[k];
      });
    } catch(e) {
      errorExit('Cannot parse configuration file');
    }
  }

  // merge command line parameters
  argv.w = argv.w || argv.worker;
  argv.r = argv.r || argv.runner;
  if ((typeof argv.w !== 'undefined' && typeof argv.w !== 'boolean') ||
      (typeof argv.r !== 'undefined' && typeof argv.r !== 'boolean')) {
    helpExit();
  }
  if (argv.w && argv.r) {
    conf.mode = 'both';
  } else if (argv.w) {
    conf.mode = 'worker';
  } else if (argv.r) {
    conf.mode = 'runner';
  }
  argv.a = argv.a || argv.adapter;
  if (argv.a) {
    if (typeof argv.a !== 'string') {
      errorExit('Adapter not given');
    }
    conf.adapter = argv.a;
  }

  // developer friendly parameters
  conf.worker = conf.runner = false;
  if (conf.mode === 'both') {
    conf.worker = true;
    conf.runner = true;
  } else if (conf.mode === 'worker') {
    conf.worker = true;
  } else if (conf.mode === 'runner') {
    conf.runner = true;
  }

  // initialize db
  var db_module = './lib/adapters/' + conf.adapter;
  if (!require.resolve(db_module))
    errorExit('Adapter does not exist');
  conf.db_module = require(db_module);
  conf.db_module.initialize(conf, function (err, db) {
    if (err)
      errorExit('Cannot establish database connection');
    conf.db = db;
    callback(err, conf);
  });
}
