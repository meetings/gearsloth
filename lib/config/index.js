var fs = require('fs');
var path = require('path');
var merge = require('../merge');
var validate = require('./validate');
var defaults = require('./defaults');

/**
 * Construct a help string that can be presented to the user.
 *
 * @param {[String]} argv
 * @return {String}
 */

function helpString(argv) {
  var ret =
    'Usage: ' + argv[0] + ' ./' +
    path.relative(process.cwd(), argv[1]) +
    ' [options] [hostname[:port]]\n' +
    '\n' +
    'Options:\n' +
    '  -h, --help           display this help and exit\n'             +
    '  -i, --injector       run as injector\n'                        +
    '  -r, --runner         run as runner\n'                          +
    '  -c, --controller     run as default passthrough controller\n'  +
    '  -e, --ejector        run as ejector\n'                         +
    '  -f, --file=FILENAME  load configuration file\n'                +
    '      --conf=JSON      use JSON configuration\n'                 +
    '      --db=NAME        use database adapter\n'                   +
    '      --dbopt=JSON     use JSON database adapter options\n'      +
    '      --servers=JSON   use given gearman server list\n'          ;
  return ret;
}

/**
 * Encapsulate options given in command line options.
 */
var parseCommandLineOptions = exports.parseCommandLineOptions = function(argv) {

  // returned object
  var ret = {};

  // configuration read from arguments
  var conf = {};

  // configuration given with --conf option
  var jsonconf = {};

  // number of positional arguments
  var pos = 0;

  // parse arguments
  for (var i = 2; i < argv.length; ++i) {
    var match;

    // parse short options
    if (argv[i].match(/^-[a-z0-9].*$/)) {
      var k = i;
      for (var j = 1; j < argv[k].length; ++j) {
        switch (argv[k][j]) {
          case 'h':
            ret.help = true;
          case 'i':
            conf.injector = true;
            break;
          case 'r':
            conf.runner = true;
            break;
          case 'c':
            conf.controller = true;
            break;
          case 'e':
            conf.ejector = true;
            break;
          case 'f':
            if (i == argv.length - 1)
              throw new Error('Expected filename after "-f"');
            ret.file = argv[++i];
            break;
          default:
            throw new Error('Unrecognized option "' + argv[k][j] +
              '" in argument "' + argv[k] + '"');
        }
      }
    }

    // parse long options
    else if (argv[i].match(/^--/)) {
      if (argv[i] === '--help')
        ret.help = true;
      else if (argv[i] === '--injector')
        conf.injector = true;
      else if (argv[i] === '--runner')
        conf.runner = true;
      else if (argv[i] === '--controller')
        conf.controller = true;
      else if (argv[i] === '--ejector')
        conf.ejector = true;
      else if (match = argv[i].match(/^--file=(.+)$/))
        ret.file = match[1];
      else if (match = argv[i].match(/^(--conf)=(.*)$/))
        jsonconf = validate.conf(parseJSON(match));
      else if (match = argv[i].match(/^--db=(.+)$/))
        conf.db = match[1];
      else if (match = argv[i].match(/^(--dbopt)=(.*)$/))
        conf.dbopt = parseJSON(match);
      else if (match = argv[i].match(/^(--servers)=(.*)$/))
        conf.servers = validate.servers(parseJSON(match));
      else
        throw new Error('Unrecongized option "' + argv[i] + '"');
    }

    // positional argument is assumed to be hostname:port
    else if (pos++ === 0) {

      // parse hostname:port argument
      var m = argv[i].match('^([^:]*)(:([0-9]*))?$');
      if (!m)
        throw new Error('Invalid hostname:port in "' + argv[i] + '"');
      var server = {};

      // hostname
      if (m[1])
        server.host = m[1];

      // port
      if (m[3])
        server.port = parseInt(m[3]);

      conf.servers = [ server ];
    }

    // unrecognized argument
    else
      throw new Error('Unrecognized argument "' + argv[i] + '"');
  }

  // set other mode options if any of them are explicitly defined
  if (conf.injector ||
      conf.runner ||
      conf.controller ||
      conf.ejector) {
    conf.injector = !!conf.injector;
    conf.runner = !!conf.runner;
    conf.controller = !!conf.controller;
    conf.ejector = !!conf.ejector;
  }

  // augment and return ret
  ret.conf = validate.conf(conf);
  ret.jsonconf = jsonconf;
  return ret;
};

/**
 * Initializes configuration based on given arguments `argv` and the default
 * configuration file. If `argv` is not given, process.argv is used. `callback`
 * is called with an error parameter and a configuration object when
 * configuration is completed. Error is thrown if errors are encountered while
 * parsing configuration options. With certain arguments (currently -h, --help)
 * a string is returned which should be displayed to the user and the process
 * should exit without an error signal.
 *
 * The configuration object which is given as an argument to `callback`
 * consists or the following fields:
 *  `.worker`:    a boolean value that indicates whether the gearslothd daemon
 *                should operate as a worker
 *  `.runner`:    a boolean value that indicates whether the gearslothd daemon
 *                should operate as a runner
 *  `.db`:        name of the database adapter
 *  `.dbopt`:     adapter-dependent database configuration object
 *  `.servers`:   an array of server objects describing gearman servers that
 *                should be connected to
 *  `.dbmodule`:  loaded database adapter module
 *  `.dbconn`:    initialized database connection object
 *
 *  Any configuration options loaded from a configuration file are overwritten
 *  by options given in --conf command line argument which in turn are
 *  overwritten by other command line options. A single server given
 *  as a positional argument overwrites previous server lists.
 *
 * @param {Array|Function} argv
 * @param {Function} callback
 * @return {String}
 */
var initialize = exports.initialize = function(argv) {

  var cmdopt = parseCommandLineOptions(argv);

  // check help parameter
  if (cmdopt.help)
    return console.log(helpString(argv));

  // check conf file
  if (cmdopt.file) {
    if (!fs.existsSync(cmdopt.file)) {
      throw new Error('Configuration file does not exist');
    }
  } else if (fs.existsSync(defaults.conf_file)) {
    cmdopt.file = defaults.conf_file;
  }

  // read configuration file
  var fileconf = {};
  if (cmdopt.file) {
    try {
      fileconf = validate.conf(JSON.parse(fs.readFileSync(cmdopt.file)));
    } catch(e) {
      throw new Error('Cannot parse configuration file');
    }
  }

  // merge configurations in the following priority order:
  // defaults.conf < fileconf < jsonconf < conf
  var ret = merge(fileconf, cmdopt.jsonconf, cmdopt.conf);

  // validate and merge defaults
  return validate.confComplete(
      validate.mergeDefaults(validate.conf(ret)));
};

/**
 * Augment config object with initialized database adapter
 */

var initializeDb = exports.initializeDb = function(conf, callback) {
  // initialize db
  var dbmodule = '../adapters/' + conf.db;
  try {
    require.resolve(dbmodule)
  } catch (e) {
    throw new Error('Cannot find database adapter "' + conf.db + '"');
  }
  conf.dbmodule = require(dbmodule);
  conf.dbmodule.initialize(conf, function (err, dbconn) {
    if (err) {
      throw new Error('Cannot establish database connection: ' + err.message);
    }
    conf.dbconn = dbconn;
    callback(err, conf);
  });
};

// private

/**
 * Parse JSON from a long argument regex match.
 *
 * @param {Object} match
 * @return {Boolean}
 */

function parseJSON(match) {
  try {
    return JSON.parse(match[2]);
  } catch (e) {
    throw new Error('Cannot parse JSON in option "' + match[1] + '"');
  }
}