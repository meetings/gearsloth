var log = require('./log');

/**
 * Encode delayed task in binary format accepted by gearsloth. `at` may be an
 * object with `.at`, `.func_name` and optional `.payload` properties.
 * Otherwise `at` must be a string formatted as an RFC2822 or ISO8601
 * timestamp, an integer value representing the number of milliseconds since 1
 * January 1970 00:00:00 UTC or a javascript date object.
 *
 * See {@link gearsloth#encodeTaskJson}
 * @deprecated
 * @param {String|Date|Number|Object} at
 * @param {String|Buffer} func_name
 * @param {String|Buffer} payload
 * @return {Buffer}
 */

function encodeTask(at, func_name, payload) {

  // handle JSON argument
  if (!(at instanceof Date) && typeof at === 'object') {
    func_name = at.func_name;
    payload = at.payload;
    at = at.at;
  }

  // handle at
  if (typeof at === 'number' ||
      typeof at === 'string') {
    at = new Date(at);
  }

  // handle func_name
  if (typeof func_name === 'string') {
    func_name = new Buffer(func_name);
  }

  // handle payload
  if (typeof payload === 'string') {
    payload = new Buffer(payload);
  } else if (typeof payload === 'undefined') {
    payload = new Buffer(0);
  }

  // check parameter types
  if (!(payload instanceof Buffer))
    throw new Error('payload must be buffer or string');
  if (!(func_name instanceof Buffer))
    throw new Error('func_name must be buffer or string');
  if (!(at instanceof Date))
    throw new Error('at must be string, number or date');

  // validate date
  if (!validateDate(at))
    throw new Error('invalid date');

  // construct buffer
  return encodeArguments([
    new Buffer(at.toISOString(), 'ascii'),
    func_name,
    payload
  ]);
}

/**
 * Encodes a task and it's payload so that they can be
 * sent over gearman. Not necessary unless payload is binary data.
 *
 * @param {Object|String} task
 * @param {Buffer} payload
 * @return {Buffer}
 */;

function encodeWithBinaryPayload(task, payload) {
  if(typeof task == 'string') {
    try {
      task = JSON.parse(task);
    } catch(e) {
      throw new Error('cannot parse JSON task ' + e);
    }
  }
  task.payload_after_null_byte = true;
  var json_string = JSON.stringify(task);
  return Buffer.concat([new Buffer(json_string + "\0"),
      new Buffer(payload)]);
}

/**
 * Decode delayed task in binary format to a JSON object with fields
 * `.at`, `.func_name`, `.payload`.
 *
 * @param {Buffer} task
 * @return {Object}
 */

function decodeTask(task) {

  // read arguments
  var args = decodeArguments(task, 2);
  if (args.length < 2)
    throw new Error('invalid task (not enough arguments)');

  // construct and validate timestamp
  var at = new Date(args[0].toString('ascii'));
  if (!validateDate(at))
    throw new Error('invalid date');

  // construct task
  var ret = {
    at: at,
    func_name: args[1]
  };
  if (args.length === 2)
    return ret;

  // payload is present
  ret.payload = args[2];
  return ret;
}

/**
 * Decode a task sent in JSON-format.
 *
 * If the task contains a null byte and `.payload_after_null_byte` is true,
 * set the task's payload to be the data following the first found null byte.
 *
 * @param {String|Buffer} task
 * @return {Object}
 */

function decodeJsonTask(task) {

  // parse as utf8 if passed a string
  // encoding errors are *not* checked
  // separate payload from JSON if null byte is found
  if (task instanceof Buffer) {
    var task_payload;
    for(var i = 1; i < task.length - 1; ++i) {
      if(task[i] == 0) {
        task_payload = task.slice(i+1, task.length);
        task = task.slice(0, i);
        break;
      }
    }
    task = task.toString();
  } else if (typeof task !== 'string') {
    throw new Error('invalid task parameter');
  }

  // parse json
  var ret;
  try {
    ret = JSON.parse(task);
  } catch(e) {
    throw new Error('cannot parse JSON task ' + e);
  }

  // check types
  if (typeof ret.at !== 'string' ||
      typeof ret.func_name !== 'string' ||
      (ret.payload && typeof ret.payload !== 'string'))
    throw new Error('invalid JSON task');

  // convert fields
  // encoding errors are *not* checked
  ret.at = new Date(ret.at);
  if (!validateDate(ret.at))
    throw new Error('invalid date');
  if (ret.func_name_encoding === 'base64')
    ret.func_name = new Buffer(ret.func_name, 'base64');
  if (ret.payload && ret.payload_encoding === 'base64')
    ret.payload = new Buffer(ret.payload, 'base64');
  if (ret.payload_after_null_byte && task_payload)
    ret.payload = task_payload;
  return ret;
}

// private

/**
 * Binary buffer containing a single null byte
 */

var null_byte = new Buffer('\0');

/**
 * Extract part of a binary buffer
 *
 * @param {Buffer} src
 * @param {Number} begin
 * @param {Number} end
 * @return {Buffer}
 */

function extractBuffer(src, begin, end) {
  var ret = new Buffer(end - begin);
  src.copy(ret, 0, begin, end);
  return ret;
}

/**
 * Parse arguments from a binary string as defined by
 * <a href="http://gearman.org/protocol/">gearman protocol</a>
 *
 * @param {Buffer} buf
 * @param {Number} required_args
 * @return {Object}
 */

function decodeArguments(buf, required_args) {
  var begin = 0;
  var end = 0;
  var ret = [];
  for (var j = 0; j < required_args; ++j) {
    for (; end < buf.length && buf[end] !== 0; ++end);
    if (end === buf.length)
      throw new Error('not enough arguments');
    ret.push(extractBuffer(buf, begin, end));
    // skip null byte
    begin = ++end;
  }

  // last parameter
  if (begin < buf.length)
    ret.push(extractBuffer(buf, begin, buf.length));
  return ret;
}

/**
 * Encode arguments as a gearman message buffer
 *
 * @param {[Buffer]} args
 * @return {Buffer}
 */

function encodeArguments(args) {
  if (args.length === 0)
    return new Buffer(0);
  var ret = [ args[0] ];
  for (var i = 1; i < args.length; ++i) {
    ret.push(null_byte);
    ret.push(args[i]);
  }
  return Buffer.concat(ret);
}

/**
 * Validate date `d`
 */

function validateDate(d) {
  return !isNaN(d.getTime());
}

/**
 * Validate date string `d`
 */

function validateDateString(d) {
  return validateDate(new Date(d));
}

// exported api

exports.encodeTask = encodeTask;
exports.encodeWithBinaryPayload = encodeWithBinaryPayload;
exports.decodeTask = decodeTask;
exports.decodeJsonTask = decodeJsonTask;
