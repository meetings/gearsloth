var mysql      = require('mysql');

function MySqlAdapter() {
  // internal variables 
  this._table_name = "sloth";
  this._status = {NEW:"NEW",
              PENDING:"PENDING",
              DONE:"DONE",
              FAIL:"FAIL"};
              
  this._database;
}

function initialize(config, callback) {
  
}

MySqlAdapter.prototype.saveTask = function(task, callback) {

}

MySqlAdapter.prototype.listenTask = function(callback) {

}

MySqlAdapter.prototype.updateTask = function(id, status, callback) {

}

MySqlAdapter.prototype.grabTask = function(id, callback) {

}

MySqlAdapter.prototype.deleteTask = function(id, callback) {

}

exports.initialize = initalize;

