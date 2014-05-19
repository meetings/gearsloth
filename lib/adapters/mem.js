/**
 * Initialize task database connection with adapter-specific `config` and a
 * callback function `callback` which will be called after the connection is
 * initialized. `callback` is called with and error object which is falseish if
 * no error happened during initalization.  The second parameter to callback is
 * an object with fields `.saveTask` and `.listenTask` that provide an API for
 * the task database.
 *
 * @param {Object} config
 * @param {Function} callback
 */

function initialize(config, callback) {

  /**
   * Save JSON-based `task` to the task database. `callback` will be called
   * with an error parameter when the `task` is succesfully save to the
   * task database or the action has failed.
   *
   * @param {Object} task
   * @param {Function} callback
   */

  function saveTask(task, callback) {
    tasks.push(task);
    callback(null);
    sendWaiting();
  }

  /**
   * Listen to tasks in waiting. `callback` will be called globally exactly
   * once per expiring task. `callback` takes an error parameter and a task
   * object.  Only one listener can be registered to the interface at a time.
   * If this function is called a second time while an active listener is still
   * present, an error will be thrown. `callback` is called before or just
   * after the task should expire - the exact strategy is defined by the
   * adapter. A function that can be called to stop active listening is
   * returned.
   *
   * @param {Function} callback
   * @return {Function}
   */

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

  callback(null, {
    saveTask: saveTask,
    listenTask: listenTask
  });
}

// export api
exports.initialize = initialize;
