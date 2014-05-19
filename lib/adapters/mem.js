function initialize(config, callback) {

  // check config
  if (!(config.worker && config.runner))
    callback(new Error('in-memory adapter must be run in mode "both"'));

  // waiting tasks
  var tasks = [];

  // current listener
  var listener = null;

  // send waiting tasks to listener
  function sendWaiting() {
    if (!listener)
      return;
    while (tasks.length)
      listener(null, tasks.shift());
  }

  // save task
  function saveTask(task, callback) {
    tasks.push(task);
    callback(null);
    sendWaiting();
  }

  // callback will be called once per task
  function listenTask(callback) {

    // check existing listener
    if (listener)
      throw new Error('listener already connected');

    // set listener
    listener = callback;

    // send waiting tasks, if available
    sendWaiting();

    // remove listener
    return function() {
      listener = null;
    }
  }

  callback(null, {
    saveTask: saveTask,
    listenTask: listenTask
  });
}

// export api
exports.initialize = initialize;
