var merge = exports.merge = require('./merge');
var component = require('./component');

exports.Component = component.Component;

/**
 * Encodes a task and it's payload so that they can be sent over gearman.
 *
 * @param {Object} task
 * @return {String}
 */

exports.encodeTask = function(task) {

  // check func_name
  // base64 encoded fields are *not* checked for validity
  if (encodeBinaryField('func_name', task))
    throw new Error('Task should contain field "func_name"');

  // check payload
  // base64 encoded fields are *not* checked for validity
  encodeBinaryField('payload', task);

  return JSON.stringify(task);
}


/**
 * Decode a task sent over gearman. Mainly for use in controller component.
 *
 * The task should consist of an utf-8 encoded JSON-string.
 *
 * @param {String|Buffer} task
 * @return {Object}
 */

exports.decodeTask = function(task) {

  // parse as utf8 if passed a string
  // encoding errors are *not* checked
  if (task instanceof Buffer) {
    task = task.toString();
  } else if (typeof task !== 'string') {
    throw new Error('Invalid task parameter');
  }

  // parse json
  var ret;
  try {
    ret = JSON.parse(task);
  } catch(e) {
    throw new Error('cannot parse JSON task ' + e);
  }

  // parse at
  if (typeof ret.at === 'string') {
    ret.at = new Date(ret.at);
  }

  // decode binary field "func_name"
  // encoding errors are *not* checked
  decodeBinaryField('func_name', ret);

  // decode binary field "func_name"
  // encoding errors are *not* checked
  decodeBinaryField('payload', ret);

  return ret;
}

// private

function encodeBinaryField(field, obj) {
  var bfield = field + '_base64';
  if (bfield in obj) {
    if (typeof obj[bfield] !== 'string')
      throw new Error('Field "' + bfield + '" should be string');
  } else if (field in obj) {
    if (obj[field] instanceof Buffer) {
      obj[bfield] = obj[field].toString('base64');
      delete obj[field];
    }
  } else {
    return true;
  }
}

function decodeBinaryField(field, obj) {
  var bfield = field + '_base64';
  if (typeof obj[bfield] === 'string')
    obj[field] = new Buffer(obj[bfield], 'base64');
}
