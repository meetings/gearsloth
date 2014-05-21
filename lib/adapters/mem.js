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
  if (!(config.worker && config.runner))
    callback(new Error('in-memory adapter must be run in mode "both"'));

  callback(null,
    new MemAdapter());
}

function MemAdapter() {
  this._tasks = []
  this._listener = null;
}

/**
 * Save JSON-based `task` to the task database. `callback` will be called
 * with an error parameter when the `task` is succesfully save to the
 * task database or the action has failed.
 *
 * @param {Object} task
 * @param {Function} callback
 */
MemAdapter.prototype.saveTask = function(task, callback) {
  this._tasks.push(task);
  callback(null);
  this._sendWaiting();
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
MemAdapter.prototype.listenTask = function(callback) {
  if (this._listener)
    throw new Error('listener already connected');

  this._listener = callback;

  // send waiting tasks, if available
  this._sendWaiting();

  // return fn to remove listener
  return function() {
    this._listener = null;
  }
}

MemAdapter.prototype._sendWaiting = function() {
  if (!this._listener)
    return;
  while (this._tasks.length)
    this._listener(null, this._tasks.shift());
}

// export api
exports.MemAdapter = MemAdapter;
exports.initialize = initialize;
