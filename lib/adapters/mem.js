var crypto = require('crypto')

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
  if (!(config.injector && config.runner && config.ejector))
    callback(new Error('in-memory adapter must be run in mode "ire"'));

  callback(null, new MemAdapter());
}

/**
 * MemAdapter constructor. This adapter forwards tasks immediately to runners
 * regardless of their expiry time.
 */
function MemAdapter() {

  // tasks waiting to be sent
  this._unsentTasks = {};

  // tasks waiting for completion or update
  // Because of the 'immediate send'-policy, we do not actually need the
  // objects here, only their ids
  this._sentTasks = {}

  // single listener
  this._listener = null;
}

/**
 * Return json md5 hash in hex encoding
 */

function hash(json) {
  return crypto.createHash('md5').
  update(JSON.stringify(json)).
  digest('hex');
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

  // generate task id
  task.id = hash(task);

  // add task and send unsent
  this._unsentTasks[task.id] = task;
  this._sendWaiting();
  callback();
};

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
  var _this = this;
  return function() {
    _this._listener = null;
  }
};

/**
 * Sends all unsent tasks to listener.
 */

MemAdapter.prototype._sendWaiting = function() {
  if (!this._listener)
    return;

  var that = this;
  Object.keys(this._unsentTasks).forEach(function(id) {

    // move unsent tasks to sent table
    var task = that._unsentTasks[id];
    that._sentTasks[id] = task;
    delete that._unsentTasks[id];

    // notify listener
    that._listener(null, task);
  });
};

/**
 * Update task with new timeout. Given `task` may be modified!
 */

MemAdapter.prototype.updateTask = function(task, callback) {
  delete this._sentTasks[task.id];
  this._unsentTasks[task.id] = task;

  // immediate send
  this._sendWaiting();
  callback();
};

/**
 * Remove tasks from system.
 */

MemAdapter.prototype.completeTask = function(task, callback) {
  delete this._sentTasks[task.id];
  callback();
};

// export api
exports.MemAdapter = MemAdapter;
exports.initialize = initialize;
