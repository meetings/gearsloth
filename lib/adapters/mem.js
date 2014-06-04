var crypto = require('crypto')

var retry_timeout = 2000; // ms

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
    callback(new Error('in-memory adapter must be run in mode "-ire"'));

  callback(null, new MemAdapter());
}

/**
 * MemAdapter constructor. This adapter forwards tasks immediately to runners
 * regardless of their expiry time.
 */
function MemAdapter() {
  this._tasks = {};

  // single listener
  this._listener = null;
}

MemAdapter.prototype.generateId = function() {
  for (;;) {
    var id = crypto.pseudoRandomBytes(4).toString('hex');
    if (!(id in this._tasks))
      return id;
  }
};

/**
 * Save JSON-based `task` to the task database. `callback` will be called
 * with an error parameter when the `task` is succesfully save to the
 * task database or the action has failed.
 *
 * @param {Object} task
 * @param {Function} callback
 */
MemAdapter.prototype.saveTask = function(task, callback) {
  var that = this;

  // generate task id
  task.id = this.generateId();

  // add task and send unsent
  this._tasks[task.id] = {
    task: task,
    expired: false,
    sent: false,
    timeout_handle: this.createTimeout(task.id, getExpiryTime(task))
  };

  callback();
};

// ms

function getExpiryTime(task) {
  var expiry_time = 0;
  if (task.after) {
    expiry_time = parseInt(task.after) * 1000;
  } else if (task.at) {
    var diff = new Date(task.at) - new Date();
    expiry_time = diff < 0 ? 0 : diff;
  }
  return expiry_time;
}

MemAdapter.prototype.createTimeout = function(id, timeout) {
  var that = this;
  return setTimeout(function() {
    var task = that._tasks[id];
    if (that._listener) {
      that._listener(undefined, task.task);
      task.sent = true;
    } else {
      task.sent = false;
    }
    task.timeout_handle = that.createTimeout(id, retry_timeout);
    task.expired = true;
  }, timeout);
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
  var that = this;
  if (this._listener)
    throw new Error('Listener already connected');

  this._listener = callback;

  // send expired unsent tasks
  Object.keys(this._tasks).forEach(function(id) {
    var task = that._tasks[id];
    if (task.expired) {
      if (!task.sent) {
        that._listener(undefined, task.task);
        task.sent = true;
        task.timeout_handle = that.createTimeout(task.id, retry_timeout);
      }
    }
  });

  // return fn to remove listener
  return function() {
    that._listener = null;
  }
};

/**
 * Update task with new timeout. Given `task` may be modified!
 */

MemAdapter.prototype.updateTask = function(task, callback) {
  var expiry_time = getExpiryTime(task);
  var entry = this._tasks[task.id];
  entry.task = task;
  clearTimeout(entry.timeout_handle);
  entry.timeout_handle = this.createTimeout(task.id, expiry_time);
  callback();
};

/**
 * Disable task.
 */

MemAdapter.prototype.disableTask = function(task, callback) {
  this.completeTask(task, callback);
};

/**
 * Remove tasks from system.
 */

MemAdapter.prototype.completeTask = function(task, callback) {
  var entry = this._tasks[task.id];
  clearTimeout(entry.timeout_handle);
  delete this._tasks[task.id];
  callback();
};

// export api
exports.MemAdapter = MemAdapter;
exports.initialize = initialize;
