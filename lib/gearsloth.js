// exported api

exports.encodeTask = encodeTask;
exports.decodeTask = decodeTask;

/**
 * Encode delayed task in binary format accepted by gearsloth. `at` may be an
 * object with `.at`, `.func_name` and optional `.payload` properties. If `at`
 * is a string, it has to be formatted as an RFC2822 or ISO8601 timestamp. If
 * `payload` is a string, it will be encoded in utf8.
 *
 * @param {String|Date|Object} at
 * @param {String} func_name
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
  if (at instanceof Date) {
    if (!validateDate(at))
      throw new Error('invalid date');
    at = at.toISOString();
  } else if (typeof at === 'string') {
    if (!validateDateString(at))
      throw new Error('invalid date string');
  }

  // handle payload
  if (typeof payload === 'string') {
    payload = new Buffer(payload);
  };

  // check parameter types
  if (typeof payload !== 'undefined' && !(payload instanceof Buffer))
    throw new Error('payload must be buffer or string');
  if (typeof func_name !== 'string')
    throw new Error('func_name must be string');
  if (typeof at !== 'string')
    throw new Error('at must be string or date');

  // construct buffer
  var ret = encodeArguments([
    new Buffer(at, 'ascii'),
    new Buffer(func_name)
  ]);
  if (typeof payload === 'undefined')
    return ret;

  // payload is present
  return encodeArguments([
    ret,
    payload
  ]);
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
  var args = decodeArguments(task);
  if (args.length < 2)
    throw new Error('invalid task (not enough arguments)');

  // construct and validate timestamp

  var at = new Date(args[0]);
  if (!validateDate(at))
    throw new Error('invalid date');

  // construct task
  var ret = {
    at: at,
    func_name: args[1].toString()
  };
  if (args.length === 2)
    return ret;

  // payload is present
  ret.payload = args[2];
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
 * @return {Object}
 */

function decodeArguments(buf) {
  var begin = 0;
  var end = 0;
  var ret = [];
  for (;;) {
    for (; end < buf.length && buf[end] !== 0; ++end);
    if (end === buf.length)
      break;
    ret.push(extractBuffer(buf, begin, end));
    // skip null byte
    begin = ++end;
  }

  // last argument is interpreted as nonexistent if the complete message is
  // of zero length
  if (begin > 0)
    ret.push(extractBuffer(buf, begin, end));
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

function validateDate(d) {
  return !isNaN(d.getTime());
}

function validateDateString(d) {
  return validateDate(new Date(d));
}
