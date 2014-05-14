var null_byte = new Buffer('\0'); 

// at:string in RFC 2822 or ISO something
// func_name: string
// payload:Buffer

function encodeTask(at, func_name, payload) {
  return Buffer.concat([
    new Buffer(at, 'utf8'),
    null_byte,
    new Buffer(func_name, 'utf8'),
    null_byte,
    payload
  ]);
}

// task: Buffer

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
