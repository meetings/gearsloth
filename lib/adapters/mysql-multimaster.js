var mysql = require('mysql');

module.exports.initialize = initialize;
module.exports.MySQLMultimaster = MySQLMultimaster;

function initialize (config, callback) {
  var adapter = new MySQLMultimaster(config);
  adapter.connect(function(err) {
    if(err)
      callback(err);
    else
      callback(null, adapter);
  });
}

function MySQLMultimaster (config) {
  this._connection = mysql.createConnection(config);
}

MySQLMultimaster.prototype.connect = function(callback) {
  this._connection.connect(callback);
};

MySQLMultimaster.prototype.saveTask = function(task, callback) {
  var sql = 'INSERT INTO gearsloth SET ?';
  var where = {
    at: getAtFromTask(task),
    task: JSON.stringify(task)
  };

  this._connection.query(sql, where, function(err, result) {
    if(err)
      callback(err);
    else
      callback(null, result.insertId);
  });
};

function getAtFromTask (task) {
  if(task.after) {
    return new Date(new Date().getTime() + task.after * 1000);
  }
  if(!task.at) {
    return new Date();
  }
  return task.at;
}

MySQLMultimaster.prototype.listenTask = function(callback) {
  
};

MySQLMultimaster.prototype.updateTask = function(task, callback) {

};

MySQLMultimaster.prototype.completeTask = function(task, callback) {
  var sql = 'DELETE FROM gearsloth WHERE ?;';
  var where = {
    id: task.id
  };

  this._connection.query(sql, where, function(err, result) {
    if(err)
      callback(err);
    else
      callback(null, result.affectedRows);
  });
};
