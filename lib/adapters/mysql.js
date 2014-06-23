/* mysql.js
 * Gearsloth mysql database adapter
 *
 * TODO:
 *  + support for sprint 2 api rewrite
 *  + clean up all the ugly sql strings
 *  - validate configuration if needed
 *  - support for multi database instances
 *    - connection pools
 *  - support for multi-master database setup
 */

var mysql = require('mysql');
var util  = require('util');
var log   = require('../log');

var SQL = {
  ins: 'INSERT INTO gearsloth VALUES (NULL, %s, ?)',
  sel: 'SELECT id, at, task FROM gearsloth WHERE at <= NOW()',
  upd: 'UPDATE gearsloth SET at = ?, task = ? WHERE id = ?',
  del: 'DELETE FROM gearsloth WHERE id = ?'
};

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

  if (task.after) {
    sql = util.format(SQL.ins, util.format(
      'DATE_ADD(NOW(), INTERVAL %s SECOND)', task.after
    ));
  }
  else if (task.at) {
    sql = util.format(SQL.ins, this._quote(task.at.toISOString()));
  }
  else {
    sql = util.format(SQL.ins, 'NOW()');
  }

  this._query(sql, [JSON.stringify(task)], callback);
};

SQLadapter.prototype.listenTask = function(callback) {
  var _this = this;
  var _continue = true;

  function poll() {
    _this._connection.query(SQL.sel, function(err, rows) {
      if (err) {
        callback(err);
        return;
      }

      rows.forEach(function(row) {
        var task = null;

        try {
          task = JSON.parse(row.task);
        }
        catch (e) {
          log.err('mysql-adapter', 'Parsing JSON failed in mysql adapter.');
          log.err('mysql-adapter', 'Database probably contains garbage.');
          log.debug('mysql-adapter', 'Error:', e.message);
          callback(e);
          return;
        }

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
  var params = [task.at, JSON.stringify(task), task.id];
  this._query(SQL.upd, params, callback);
};

SQLadapter.prototype.completeTask = function(task, callback) {
  this._query(SQL.del, [task.id], callback);
};

SQLadapter.prototype._query = function(sql, params, callback) {
  this._connection.query(sql, params, function(err, result) {
    if (err) {
      log.err('mysql-adapter', 'Query failed in mysql adapter.');
      log.debug('mysql-adapter', 'Error:', err.message);
      callback(err);
      return;
    }
    callback(null, result);
  });
};

SQLadapter.prototype._quote = function(str) { return "'" + str + "'"; };
