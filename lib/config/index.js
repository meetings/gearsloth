var fs = require('fs');
var path = require('path');
var merge = require('../merge');
var validate = require('./validate');
var defaults = require('./defaults');

/**
 * Initializes configuration based on configuration files and given arguments
 * `argv`. An error is thrown
 * if errors are encountered while
 * parsing configuration options.
 *
 * The returned configuration object consists or the following fields:
 *  `.injector {Boolean}`:    A boolean value that indicates whether the
 *                            gearslothd daemon should operate as an injector.
 *  `.runner {Boolean}`:      A boolean value that indicates whether the
 *                            gearslothd daemon should operate as a runner.
 *  `.controller {Boolean}`:  A boolean value that indicates whether the
 *                            gearslothd daemon should operate as a default
 *                            controller.
 *  `.ejector {Boolean}`:     A boolean value that indicates whether the
 *                            gearslothd daemon should operate as an ejector.
 *  `.verbose {Integer}`:     Integer that indicates the verbosity level.
 *  `.db {String}`:           Name of the database adapter.
 *  `.dbopt {Object}`:        Adapter-dependent database configuration object.
 *  `.servers {[Object}]`:    An array of server objects describing gearman
 *                            servers that are connected to.
 *
 *  Any configuration options loaded from a configuration file are overridden
 *  by options given in --conf command line argument which in turn are
 *  overwritten by other command line options. A single server given
 *  as a positional argument overwrites previous server lists. Any daemon modes
 *  explicitly defined in command line arguments override modes defined in
 *  configuration file or --conf option.
 *
 * @param {[String]} argv
 * @return {Object}
 */
var initialize = exports.initialize = function(argv) {

  var cmdopt = parseCommandLineOptions(argv);

  // check help parameter
  if (cmdopt.help)
    return log(helpString(argv));

  // check conf file
  if (cmdopt.file) {
    if (!fs.existsSync(cmdopt.file)) {
      throw new Error('Configuration file does not exist');
    }
  } else {
    for (var i = 0; i < defaults.conf_paths.length; ++i) {
      if (fs.existsSync(defaults.conf_paths[i])) {
        cmdopt.file = defaults.conf_paths[i];
        break;
      }
    }
  }

  // read configuration file
  var fileconf = {};
  if (cmdopt.file) {
    try {
      fileconf = validate.conf(JSON.parse(fs.readFileSync(cmdopt.file)));
    } catch (e) {
      throw new Error('Cannot parse configuration file');
    }
  }

  // merge configurations in the following priority order:
  // defaults.conf < fileconf < jsonconf < conf
  var conf = merge(fileconf, cmdopt.jsonconf, cmdopt.conf);

  // validate and merge defaults
  conf = validate.confComplete(validate.mergeDefaults(validate.conf(conf)));

  if (conf) {
    try {
      conf.controllerpath = resolveModulePath('../controllers', conf.controllername);
    }
    catch (e) {
      throw new Error('Cannot find controller "' + conf.controllername + '"');
    }
  }

  return conf;
};

/**
 * Augment config object with initialized database adapter. `callback` is
 * called with a augmented configuration object if adapter initialization is
 * successful. On error an error is thrown. The configuration object is
 * augmented with the following fields:
 *
 * `.dbmodule {Object}`:        The database adapter module loaded with
 *                              `require`.
 * `.dbconn {Object}`:          The initialized database connection.
 * `.controllerpath {String}`:  Normalized and resolved controller module path.
 *
 * @param {Object} conf
 * @param {Function} callback
 */

var initializeDb = exports.initializeDb = function(conf, callback) {
  var db_module;
  if (typeof(conf.db) == 'string') {
    try {
      db_module = require(conf.db);
    } catch (e) {
      throw new Error('Cannot find database adapter "' + conf.db + '"');
    }
  }
  else {
    db_module = conf.db;
  }

  db_module.initialize(conf, function(err, dbconn) {
    if (err) {
      throw new Error('Cannot establish database connection: ' + err.message);
    }
    callback(err, dbconn);
  });
};

function resolveModulePath(base, name) {
  if (name.match('/')) {
    // resolve module relative to current directory
    var relpath = path.normalize(path.resolve(name));
    console.log(relpath);
    return require.resolve(relpath);
  } else {
    try {
      // resolve module relative to this file + base
      return require.resolve(path.join(__dirname, base, name));
    } catch (e) {
      // resolve according to node require logic
      return require.resolve(name);
    }
  }
}

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

/**
 * Construct a help string that can be presented to the user.
 *
 * @param {[String]} argv
 * @return {String}
 */

var helpString = exports.helpString = function(argv) {
  var ret =
    'Usage: ' + argv[0] + ' ./' +
    path.relative(process.cwd(), argv[1]) +
    ' [options] [hostname[:port]]\n' +
    '\n' +
    'Options:\n' +
    '  -h, --help                   display this help and exit\n'          +
    '  -i, --injector               run as injector\n'                     +
    '  -r, --runner                 run as runner\n'                       +
    '  -c, --controller             run as controller using module NAME\n' +
    '  -e, --ejector                run as ejector\n'                      +
    '  -v, --verbose                set verbose output\n'                  +
    '  -f, --file=FILENAME          load configuration file\n'             +
    '      --conf=JSON              use JSON configuration\n'              +
    '      --controllername=NAME    use specified controller module\n'     +
    '      --db=NAME                use database adapter\n'                +
    '      --dbopt=JSON             use JSON database adapter options\n'   +
    '      --servers=JSON           use given gearman server list\n';
  return ret;
};

/**
 * Encapsulate options given as command line arguments.
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
            break;
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
          case 'v':
            conf.verbose = conf.verbose ? conf.verbose + 1 : 1;
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
      else if (argv[i] === '--verbose')
        conf.verbose = conf.verbose ? conf.verbose + 1 : 1;
      else if ((match = argv[i].match(/^--file=(.+)$/)) !== null)
        ret.file = match[1];
      else if ((match = argv[i].match(/^--controllername=(.+)$/)) !== null)
        conf.controllername = match[1];
      else if ((match = argv[i].match(/^(--conf)=(.*)$/)) !== null)
        jsonconf = validate.conf(parseJSON(match));
      else if ((match = argv[i].match(/^--db=(.+)$/)) !== null)
        conf.db = match[1];
      else if ((match = argv[i].match(/^(--dbopt)=(.*)$/)) !== null)
        conf.dbopt = parseJSON(match);
      else if ((match = argv[i].match(/^(--servers)=(.*)$/)) !== null)
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

      conf.servers = [server];
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

// for testing T_T
var log = console.log;
var setLog = exports.setLog = function(logf) {
  log = logf;
};
