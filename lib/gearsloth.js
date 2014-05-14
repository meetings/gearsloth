var null_byte = new Buffer('\0'); 

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
  if (at instanceof Date) {
    at = at.toISOString();
  } else if (typeof at === 'object') {
    func_name = at.func_name;
    payload = at.payload;
    at = at.at;
  }

  if (typeof payload === 'string') {
    payload = new Buffer(payload, 'utf8');
  } else if (typeof payload === 'undefined') {
    payload = new Buffer(0);
  }
  
  if ((!(payload instanceof Buffer)) ||
      (typeof func_name !== 'string') ||
      (typeof at !== 'string') ) {
    throw new Error('invalid payload type');
  }

  return Buffer.concat([
    new Buffer(at, 'utf8'),
    null_byte,
    new Buffer(func_name, 'utf8'),
    null_byte,
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
  var i = 0;
  var at, func_name, payload;
  
  // the first argument before null is the timestamp
  for (; i < task.length && task[i] !== 0; ++i);
  if (i === task.length)
    throw new Error('can\'t parse task');
  at = new Buffer(i);
  task.copy(at, 0, 0, i);

  // function name
  for (++i; i < task.length && task[i] !== 0; ++i);
  if (i === task.length)
    throw new Error('can\'t parse task');
  func_name = new Buffer(i - at.length - 1);
  task.copy(func_name, 0, at.length + 1, i);

  // the rest is parsed as payload
  payload = new Buffer(task.length - i - 1);
  task.copy(payload, 0, i + 1);
  return {
    at: at.toString('utf8'),
    func_name: func_name.toString('utf8'),
    payload: payload
  };
}

// exported api

exports.encodeTask = encodeTask;
exports.decodeTask = decodeTask;
