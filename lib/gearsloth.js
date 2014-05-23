// exported api
exports.encodeWithBinaryPayload = encodeWithBinaryPayload;
exports.decodeTask = decodeTask;

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
 * Decode a task sent over gearman.
 *
 * The task should consist of an utf-8 encoded JSON-string and an optional
 * binary payload.
 *
 * If the task contains a null byte and `.payload_after_null_byte` is true,
 * set the task's payload to be the data following the first found null byte.
 *
 * @param {String|Buffer} task
 * @return {Object}
 */

function decodeTask(task) {

  // parse as utf8 if passed a string
  // encoding errors are *not* checked
  // separate payload from JSON if null byte is found
  if (task instanceof Buffer) {
    var task_payload;
    for(var i = 1; i < task.length; ++i) {
      if(task[i] == 0) {
        task_payload = task.slice(Math.min(i+1,task.length), task.length);
        task = task.slice(0, i);
        break;
      }
    }
    task = task.toString();
  } else if (typeof task !== 'string') {
    throw new Error('invalid task parameter');
  }

  // parse json
  var result;
  try {
    result = JSON.parse(task);
  } catch(e) {
    throw new Error('cannot parse JSON task ' + e);
  }

  if(!validateFieldTypes(result)) {
    throw new Error('invalid JSON task');
  }

  result.at = new Date(result.at);
  if (!validateDate(result.at)) {
    throw new Error('invalid date');
  }

  // check binary payload
  if(result.payload_after_null_byte) {
    result.payload = task_payload;
  } else if(task_payload) {
    throw new Error('payload_after_null_byte was not set but \
task was followed by unexpected data');
  }

  return result;
}

// private

/** 
 * Validate the types of the essential fields in a task 
 */

function validateFieldTypes(task) {
  return (typeof task.at === 'string' &&
      typeof task.func_name === 'string' &&
      (!task.payload ||
       (typeof task.payload === 'string' ||
         task.payload instanceof Object)));
}

/**
 * Validate date `d`
 */

function validateDate(d) {
  return !isNaN(d.getTime());
}

