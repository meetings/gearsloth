/* mysql.js
 * Gearsloth mysql database adapter
 *
 * TODO:
 * - validating configuration if needed
 * - support for multi-master database setup
 *   - connection pools
 */

var mysql = require('mysql');
var util  = require('util');
var log   = require('../log');

module.exports = {
  initialize: initalize
};

function MySqlAdapter() {
  this._table_name = "gearsloth";

  this._status = {
    NEW:     "NEW",
    PENDING: "PENDING",
    DONE:    "DONE",
    FAIL:    "FAIL"
  };

  this._connection = null;
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
  this._connection = mysql.createConnection(config);
  this._connection.connect(function(err) {
    if (err) callback(err);
  });
  callback(null, new MySqlAdapter());
}

MySqlAdapter.prototype.saveTask = function(task, callback) {
  var ruma_sql = util.format(
    'INSERT INTO %s VALUES (?, ?, ?, ?, ?, ?)', this._table_name
  );

  var params = [
    // FIXME: task.at.toString() ?
    task.at, task.func_name, task.payload, task.strategy,
    task.strategy_options, this._status.NEW
  ];

  this._query(ruma_sql, params, callback);

  /*
  this._connection.query(ruma_sql, params, function(err, paskaa) {
    if (err) callback(err);

    log.debug("MITÄ TÄÄ ON HEI OIKEESTI TYYPIT JOOKO!?!?!", paskaa);

    callback();
  });
  */
};

MySqlAdapter.prototype.listenTask = function(callback) {
  setTimeout(poll, 0);

  var _continue = true;
  var ruma_sql = util.format(
    'SELECT * FROM %s WHERE at <= NOW() AND status = ?', this._table_name
  );

  function poll() {
    this._connection(ruma_sql, [this._status.NEW], function(err, rows, jotain) {
      if (err) callback(err);

      debug("ROWS", rows);
      debug("FIELDS ::", jotain);

      rows.forEach(function(row) {
        callback(null, row.id); // FIXME: id on arvaus, testaa
      });

      if (_continue) {
        setTimeout(poll, 1000);
      }
    });
  }
};

MySqlAdapter.prototype.updateTask = function(id, status, callback) {
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

MySqlAdapter.prototype.grabTask = function(id, callback) {
  var eka_sql  = 'SELECT * FROM gearsloth WHERE id = ? LIMIT 1';
  var toka_sql = 'UPDATE gearsloth SET status = ? WHERE id = ?';

  this._connection.beginTransaction(function(err) {
    if (err) callback(err);

    this._connection.query(eka_sql, [id], function(err, result) {
      if (err) {
        this._connection.rollback();
        callback(err);
      }

      /* FIXME: Tähän jokin tarkistus siitä, että myö saatiin jotain takaisin.
       *        Jossei saatu mitään, ei pitäis myöskään jatkaa.
       */

      this._connection.query(toka_sql, [this._status.PENDING, id], function(err) {
        if (err) {
          this._connection.rollback();
          callback(err);
        }

        this._connection.commit(function(err) {
          if (err) {
            this._connection.rollback();
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

MySqlAdapter.prototype.deleteTask = function(id, callback) {
  var ruma_sql = util.format(
    'DELETE FROM %s WHERE id = ?', this._table_name
  );

  this._query(ruma_sql, [id], callback);
};

/*
 */
MySqlAdapter.prototype._query = function(sql, params, callback) {
  this._connection.query(sql, params, function(err, result) {
    if (err) callback(err);
    log.debug("SQL QUERY RESULTS ARE ::", result);
    callback();
  });
};
