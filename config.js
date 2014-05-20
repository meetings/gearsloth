var fs = require('fs');
var path = require('path');
var validate = require('./validate');

// default gearman server
var def_server = {
  "host": "localhost",
  "port": 4730
}

// default configuration file
var def_conf_file = 'gearsloth.json';

// default configuration object
var def_conf = {
  db: 'mem',
  servers: [ def_server ]
};

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
    '  -h, --help           display this help and exit\n'         +
    '  -w, --worker         run as worker\n'                      +
    '  -r, --runner         run as runner\n'                      +
    '  -f, --file=FILENAME  load configuration file\n'            +
    '      --conf=JSON      use JSON configuration\n'             +
    '      --db=NAME        use database adapter\n'               +
    '      --dbopt=JSON     use JSON database adapter options\n'  +
    '      --servers=JSON   use given gearman server list\n'      ;
  return ret;
}

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
function initialize(argv, callback) {

  // process.argv are used by default
  if (typeof argv === 'function') {
    callback = argv;
    argv = process.argv;
  }

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
            return helpString(argv);
          case 'w':
            conf.worker = true;
            break;
          case 'r':
            conf.runner = true;
            break;
          case 'f':
            if (i == argv.length - 1)
              throw new Error('Expected filename after "-f"');
            conf.file = argv[++i];
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
        return helpString(argv);
      else if (argv[i] === '--worker')
        conf.worker = true;
      else if (argv[i] === '--runner')
        conf.runner = true;
      else if (match = argv[i].match(/^--file=(.+)$/))
        conf.file = match[1];
      else if (match = argv[i].match(/^(--conf)=(.*)$/))
        jsonconf = parseJSON(match);
      else if (match = argv[i].match(/^--db=(.+)$/))
        conf.db = match[1];
      else if (match = argv[i].match(/^(--dbopt)=(.*)$/))
        conf.dbopt = parseJSON(match);
      else if (match = argv[i].match(/^(--servers)=(.*)$/))
        conf.servers = parseJSON(match);
      else
        throw new Error('Unrecongized option "' + argv[i] + '"');
    }

    // positional argument is assumed to be hostname:port
    else if (pos++ === 0) {

      // parse hostname:port argument
      var m = argv[i].match('^([^:]*)(:([0-9]*))?$');
      if (!m)
        throw new Error('Invalid hostname:port in "' + argv[i] + '"');
      conf.server = {};
      merge(conf.server, def_server);

      // hostname
      if (m[1])
        conf.server.host = m[1];

      // port
      if (m[3]) {
        conf.server.port = parseInt(m[3]);
        if (isNaN(conf.server.port))
          throw new Error('Invalid port');
      }
    }

    // unrecognized argument
    else
      throw new Error('Unrecognized argument "' + argv[i] + '"');
  }

  // validate json configurations given in arguments
  if (jsonconf) {
    if (!validate.validateJsonConf(jsonconf))
      throw new Error('Invalid configuration given in --conf');
  }
  if (conf.servers) {
    if (!validate.validateServers(conf.servers)) {
      throw new Error('Invalid servers configuration given in --servers');
    }
  }

  // check conf file
  if (conf.file) {
    if (!fs.existsSync(conf.file)) {
      throw new Error('Configuration file does not exist');
    }
  } else if (fs.existsSync(def_conf_file)) {
    conf.file = def_conf_file;
  }

  // read configuration file
  var fileconf = {};
  if (conf.file) {
    try {
      fileconf = JSON.parse(fs.readFileSync(conf.file));
    } catch(e) {
      throw new Error('Cannot parse configuration file');
    }
    if (!validate.validateJsonConf(fileconf))
      throw new Error('Invalid JSON configuration in configuration file');
  }

  // merge configurations in priority order of
  // def_conf < fileconf < jsonconf < conf
  //
  // yeah, this sucks... refactoring needed!
  var dconf = {};
  merge(dconf, def_conf);
  merge(dconf, fileconf);
  fileconf = dconf;
  merge(fileconf, jsonconf);

  // any argument set worker/runner option overrides previous configurations
  if (conf.worker || conf.runner)
    delete fileconf.mode;

  // convert .mode to more developer friendly .worker/.runner
  if (fileconf.mode === 'both') {
    fileconf.worker = true;
    fileconf.runner = true;
  } else if (fileconf.mode === 'worker') {
    fileconf.worker = true;
  } else if (fileconf.mode === 'runner') {
    fileconf.runner = true;
  }
  delete fileconf.mode;

  merge(fileconf, conf);
  conf = fileconf;

  // server given in arguments overrides servers list
  if (conf.server) {
    conf.servers = [ conf.server ];
    delete conf.server;
  }

  // default worker/runner state
  if (typeof conf.worker === 'undefined' &&
      typeof conf.runner === 'undefined') {
    conf.worker = true;
    conf.runner = true;
  }

  // convert server ports to numerical values
  conf.servers.forEach(function(s) {
    if (s.port) {
      s.port = parseInt(s.port);
      if (isNaN(s.port))
        throw new Error('Invalid port in servers list');
    } else {
      s.port = def_server.port;
    }
  });

  // initialize db
  var dbmodule = './lib/adapters/' + conf.db;
  try {
    require.resolve(dbmodule)
  } catch (e) {
    throw new Error('Cannot find database adapter "' + dbmodule + '"');
  }
  conf.dbmodule = require(dbmodule);
  conf.dbmodule.initialize(conf, function (err, dbconn) {
    if (err) {
      throw new Error('Cannot establish database connection: ' + err.message);
    }
    conf.dbconn = dbconn;
    callback(err, conf);
  });
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
 * Shallow merge `src` to `dst` and return merged object.
 *
 * @param {Object} dst
 * @param {Object} src
 * @return {Object}
 */

function merge(dst, src) {
  Object.keys(src).forEach(function(k) {
    dst[k] = src[k];
  });
  return dst;
}

// export api
exports.initialize = initialize;
