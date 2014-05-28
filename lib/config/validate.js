var merge = require('../merge');
var defaults = require('./defaults');

/**
 * This file describes the exact format of the JSON configuration file that can
 * be passed to gearslothd as a configuration file or with a --conf command
 * line option. `.dbopt` field is a freeform object whose format depends
 * on the database adapter used. Undefined required fields are filled with
 * default values.
 */

/**
 * Validate and clean boolean :p
 *
 * @param {String|Boolean} bool
 * @param {Boolean}
 */

var bool = exports.bool = function(bool) {
  if (typeof bool === 'boolean')
    return bool;
  if (bool === 'true')
    return true;
  if (bool === 'false')
    return false;
  throw new Error('Invalid boolean (should be "true", "false" or boolean');
};


/**
 * Validate and clean a server configuration object. Undefined values are
 * replaced with default values.
 *
 * @param {Object} server server configuration
 * @return {Object} validated and cleaned configuration object
 */

var server = exports.server = function(server) {
  if (typeof server === 'undefined')
    server = {};
  var ret = merge(defaults.server, server);
  if (typeof ret.host !== 'string')
    throw new Error('Field .host has to be a string');
  ret.port = parseInt(ret.port);
  if (isNaN(ret.port))
    throw new Error('Field .port has to be a valid integer');
  if (ret.port < 1 || ret.port > 65535)
    throw new Error('Field .port not in range [1, 65535]');
  return ret;
};

/**
 * Validate and clean a server configuration list. Undefined values are
 * replaced with default values.
 *
 * @param {[Object]|Object} servers or a single server configuratio object
 * @return {[Object]} validated and cleaned server list
 */

var servers = exports.servers = function(servers) {
  if (!servers)
    servers = {};
  if (!Array.isArray(servers))
    servers = [ servers ];
  if (servers.length === 0)
    servers = [ server() ];
  // map won't work for certain cases ([,] for example)
  for (var i = 0; i < servers.length; ++i) {
    servers[i] = server(servers[i]);
  }
  return servers;
};

/**
 * Validate and clean a boolean field.
 */

function confBool(obj, field) {
  if (field in obj)
    obj[field] = bool(obj[field]);
}

var boolFields = [
  'injector',
  'runner',
  'controller',
  'ejector'
];

/**
 * Validate and clean gearsloth configuration object.
 *
 * @param {Object} conf configuration object
 * @parma {Object} validated and cleaned configuration object
 */

var conf = exports.conf = function(conf) {
  if (!conf)
    conf = {};
  boolFields.forEach(function(field) {
    confBool(conf, field);
  });
  if ('conf' in conf) {
    if (typeof conf.db !== 'string')
      throw new Error('Field .db must be a string');
    if (!conf.db)
      throw new Error('Field .db must not be an empty string');
  }
  if ('servers' in conf)
    conf.servers = servers(conf.servers);
  // dbopt is not checked
  return conf;
};

/**
 * Merge defaults
 */

var mergeDefaults = exports.mergeDefaults = function(conf) {
  var m = {};

  // set default bool fields as true if none are explicitly set
  if (!boolFields.reduce(function(acc, field) {
    return acc || (field in conf);
  }, false)) {
    boolFields.forEach(function(field) {
      m[field] = true;
    });
  }

  // default servers
  if (!('servers' in conf))
    m.servers = servers();

  // merge and return
  return merge(defaults.conf, conf, m);
};

/**
 * Validate complete configuration object
 */

var confComplete = exports.confComplete = function(conf) {
  if (!boolFields.reduce(function(acc, field) {
    return acc || conf[field];
  }, false))
    throw new Error('All mode options turned off');
  return conf;
};
