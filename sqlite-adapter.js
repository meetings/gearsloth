// require sqlite3, the database type
var sqlite3 = require('sqlite3').verbose();
var database;
var table = "sloths";

// callback function to be called on connection initialization
function initTable(error) {
  if (error) {
    console.log(error.toString());
    return null;
  }

  database.serialize(function() {
    database.run("CREATE TABLE IF NOT EXISTS sloths (", [table], function(error) {
	console.log(error.toString());
    });
  });
}

// initialize database connection from handle or into memory
function initializeWithHandle(db_handle) {
  if (!db_handle) {
    database = new sqlite3.Database(':memory:', initTable );
  } else {
    database = new sqlite3.Database(db_handle, initTable );
  }

  return database;
}

// initialize database connections from configuration file
function initializeFromFile(configuration) {
}

// save the given task into the database
function saveTask(func_name, at, payload) {
  database.serialize(function() {
  });
}

function readSingle(id) {
}

function readMatching(fieldtype, value) {
}

function update(id) {
}

function deleteSingle(id) {
}

function deleteMatching(fieldtype, value) {
}

// methods visible to the outside
exports.initalizeWithHandle = initializeWithHandle;
exports.saveTask = saveTask;
exports.readSingle = readSingle;
exports.update = update;
exports.deleteSingle = deleteSingle;
