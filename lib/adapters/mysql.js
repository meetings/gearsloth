/* mysql.js
 * Gearsloth mysql database adapter
 *
 * TODO:
 * - validating configuration if needed
 * - support for multi database instances
 *   - connection pools
 * - support for multi-master database setup
 */

var mysql = require('mysql');
var util  = require('util');
var log   = require('../log');

module.exports.initialize = initialize;

function SQLadapter(config) {
  this._connection = mysql.createConnection(config);
  this._table_name = 'gearsloth';
  this._status = {
    NEW:     1,
    PENDING: 2,
    DONE:    4,
    FAIL:    0
  };
}

/* FIXME: Use pool cluster: https://github.com/felixge/node-mysql#poolcluster
 *
 * DEBUG :: config should be something like this:
 * {
 *   host     : 'localhost',
 *   user     : 'me',
 *   password : 'secret'
 * }
 */
function initialize(config, callback) {
  var adapter = new SQLadapter(config);
  callback(null, adapter);
}

SQLadapter.prototype.saveTask = function(task, callback) {
  var ruma_sql = util.format(
    'INSERT INTO %s VALUES (NULL, ?, ?, ?, ?, ?, ?)', this._table_name
  );

  /* example_task = {
    at: new Date(),
    func_name: 'log',
    payload: 'kittehs',
    strategy:'special',
    strategy_options: {
    /// retry:true,
    /// times:3
  } */

  var params = [
    task.at.toISOString(), task.func_name, task.payload,
    task.strategy, JSON.stringify(task.strategy_options), this._status.NEW
  ];

  this._query(ruma_sql, params, callback);
};

SQLadapter.prototype.listenTask = function(callback) {
  setTimeout(poll, 0);

  var _this = this;
  var _continue = true;
  var ruma_sql = util.format(
    'SELECT * FROM %s WHERE at <= NOW() AND status = ?', this._table_name
  );

  function poll() {
    _this._connection.query(ruma_sql, [_this._status.NEW], function(err, rows) {
      if (err) callback(err);

      /// log.debug("ROWS", rows);

      rows.forEach(function(row) {
        /// log.debug("tästä pitäis pulpauttaa id ulos", row);
        callback(null, row.id);
      });

      if (_continue) {
        setTimeout(poll, 1000);
      }
    });
  }
};

SQLadapter.prototype.updateTask = function(id, status, callback) {
  var ruma_sql = util.format(
    'UPDATE %s SET status = ? WHERE id = ?', this._table_name
  );

  this._query(ruma_sql, [status, id], callback);

  /*
  this._connection.query(ruma_sql, params, function(err, paskaa) {
    if (err) callback(err);
    log.debug("BLÖÖ!?!?!", paskaa);
    callback();
  });
  */
};

SQLadapter.prototype.grabTask = function(id, callback) {
  var adapter = this;
  var eka_sql  = 'SELECT * FROM gearsloth WHERE id = ? LIMIT 1';
  var toka_sql = 'UPDATE gearsloth SET status = ? WHERE id = ?';

  adapter._connection.beginTransaction(function(err) {
    if (err) callback(err);

    adapter._connection.query(eka_sql, [id], function(err, result) {
      if (err) {
        adapter._connection.rollback();
        callback(err);
      }

      /* FIXME: Tähän jokin tarkistus siitä, että myö saatiin jotain takaisin.
       *        Jossei saatu mitään, ei pitäis myöskään jatkaa.
       */

      adapter._connection.query(toka_sql, [adapter._status.PENDING, id], function(err) {
        if (err) {
          adapter._connection.rollback();
          callback(err);
        }

        adapter._connection.commit(function(err) {
          if (err) {
            adapter._connection.rollback();
            callback(err);
          }

          callback(result);
        });
      });
    });
  });

  /* START TRANSACTION;
   * SELECT * WHERE id = ?id? LIMIT 1;
   * UPDATE %s SET status = ?status.pending? WHERE id = ?id?;
   * COMMIT;
   */
};

SQLadapter.prototype.deleteTask = function(id, callback) {
  var ruma_sql = util.format(
    'DELETE FROM %s WHERE id = ?', this._table_name
  );

  this._query(ruma_sql, [id], callback);
};

SQLadapter.prototype._query = function(sql, params, callback) {
  this._connection.query(sql, params, function(err, result) {
    if (err) {
      log.debug('database query returned an error', err);
      callback(err);
    }

    /// log.debug("SQL QUERY RESULTS ARE ::", result); /// undefined if fail

    callback();
  });
};
