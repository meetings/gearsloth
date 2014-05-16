function initialize(opt, callback) {
  var tasks = [];
  var listeners = [];

  function listenTasks(callback) {
    listeners.push(callback);
  }

  callback(undefined, {
    saveTask: function(task, callback) {
      tasks.push(task);
      listeners.forEach(function(listener) {
        listener(task);
      });
      callback();
    },
    readTasks: function(callback) {
      callback(undefined, tasks);
    },
    listenTasks: listenTasks
  });
}

exports.initialize = initialize;
