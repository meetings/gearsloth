/* mysql.js
 * Gearsloth mysql database adapter
 *
 * TODO:
 *  + support for sprint 2 api rewrite
 *  - clean up all the ugly sql strings
 *  - validating configuration if needed
 *  - support for multi database instances
 *    - connection pools
 *  - support for multi-master database setup
 */

var mysql = require('mysql');
var util  = require('util');
var log   = require('../log');

module.exports.initialize = initialize;

function SQLadapter(config) {
  this._connection = mysql.createConnection(config);
}

/* FIXME: Use pool cluster: https://github.com/felixge/node-mysql#poolcluster
 */
function initialize(config, callback) {
  var adapter = new SQLadapter(config);
  callback(null, adapter);
}

SQLadapter.prototype.saveTask = function(task, callback) {
  var sql = '';

  var ruma_sql = 'INSERT INTO gearsloth VALUES (NULL, %s, ?)';

  if (task.after) {
    at = util.format(ruma_sql, util.format(
      'DATE_ADD(NOW(), INTERVAL %s SECOND)', task.after
    ));
  }
  else if (task.at) {
    sql = util.format(ruma_sql, quote(task.at.toISOString()));
  }
  else {
    sql = util.format(ruma_sql, 'NOW()');
    at = 'NOW()';
  }

  this._query(ruma_sql, [JSON.stringify(task)], callback);
};

SQLadapter.prototype.listenTask = function(callback) {
  var _this = this;
  var _continue = true;

  var ruma_sql = 'SELECT id, at, task FROM gearsloth WHERE at <= NOW()';

  function poll() {
    _this._connection.query(ruma_sql, function(err, rows) {
      if (err) {
        callback(err);
        return;
      }

      rows.forEach(function(row) {
        log.debug("ROW n", row);

        var task = JSON.parse(row.task);

        task.id = row.id;
        task.database = null;

        callback(null, task);
      });

      if (_continue) {
        setTimeout(poll, 3333);
      }
    });
  }

  setTimeout(poll, 0);

  return function() { _continue = false; };
};

SQLadapter.prototype.updateTask = function(task, callback) {
  var ruma_sql = 'UPDATE gearsloth SET at = ?, task = ? WHERE id = ?';

  var params = [task.at, JSON.stringify(task), task.id];

  this._query(ruma_sql, params, callback);
};

SQLadapter.prototype.completeTask = function(task, callback) {
  var ruma_sql = 'DELETE FROM gearsloth WHERE id = ?';

  this._query(ruma_sql, [task.id], callback);
};

SQLadapter.prototype._query = function(sql, params, callback) {
  this._connection.query(sql, params, function(err, result) {
    if (err) {
      log.debug('database query returned an error', err);
      callback(err);
      return;
    }

    log.debug("SQL QUERY RESULTS ARE ::", result); /// undefined if fail

    callback();
  });
};

function quote(str) {
  return "'" + str + "'";
}
