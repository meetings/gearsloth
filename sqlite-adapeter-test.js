// require the db adapter
var db = require('./sqlite-adapter');

// initialize with a handle into a regular file, empty for in-memory
var dbconn = db.initalizeWithHandle("random");

// check what is the status of the database connection
console.log(dbconn);

// close the connection
dbconn.close();
