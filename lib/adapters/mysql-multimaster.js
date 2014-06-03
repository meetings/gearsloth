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
};

function MySQLMultimaster (config) {
  this._connection = mysql.createConnection(config);
}

MySQLMultimaster.prototype.connect = function(callback) {
  this._connection.connect(callback);
};

MySQLMultimaster.prototype.saveTask = function(task, callback) {

};

MySQLMultimaster.prototype.listenTask = function(callback) {
  
};

MySQLMultimaster.prototype.updateTask = function(task, callback) {

};

MySQLMultimaster.prototype.completeTask = function(task, callback) {

};