var containers = require('../../lib/test-helpers/containers');
var mysql_adapter = require('../../lib/adapters/mysql'),
    mysql = require('mysql'),
    chai = require('chai'),
    expect = chai.expect,
    async = require('async');

chai.should();

var config;
var master;
var slave;
var master_container;
var slave_container;
var adapter;

suite('mysql-multimaster (docker)', function() {

  suite('initialize', function() {

    suiteSetup(function(done) {
      this.timeout(10000);
      setupMultimaster(done);
    });

    suiteTeardown(function(done) {
      this.timeout(5000);
      cleanupMultimaster(done);
    });

    test('should create table and check it propagated to slave', function(done) {
      async.auto({
        initialize_adapter: function(cb) {
          mysql_adapter.initialize(config, function(err, adapter) {
            cb(err);
          });
        },
        check_master: ['initialize_adapter', function(cb) {
          master.query("SHOW TABLES LIKE 'gearsloth%'", function(err, rows) {
            rows.should.have.length(2);
            cb(err);
          });
        }],
        check_slave: ['initialize_adapter', function(cb) {
          slave.query("SHOW TABLES LIKE 'gearsloth%'", function(err, rows) {
            rows.should.have.length(2);
            cb(err);
          });
        }]
      }, done);
    });

    test('should not crash if table exists', function(done) {
      async.auto({
        check_master_created: function(cb) {
          master.query("SHOW TABLES LIKE 'gearsloth%'", function(err, rows) {
            rows.should.have.length(2);
            cb(err);
          });
        },
        initialize_adapter: ['check_master_created', function(cb) {
          mysql_adapter.initialize(config, function(err, adapter) {
            cb(err);
          });
        }]
      }, done);
    });
  });

  suite('with new container for every test', function() {

    setup(function(done) {
      this.timeout(10000);
      setupMultimaster(function() {
        mysql_adapter.initialize(config, function(err, a) {
          adapter = a;
          done(err);
        });
      });
    });

    teardown(function(done) {
      this.timeout(5000);
      cleanupMultimaster(done);
    });

    suite('saveTask', function() {
      var task = {
        after: 100,
        func_name: 'sprölts'
      };

      test('should save task correctly', function(done) {
        adapter.saveTask(task, function(err, inserted_id) {
          if(err)
            return done(err);

          var sql = "SELECT state FROM gearsloth WHERE id = ?";

          master.query(sql, [inserted_id], function(err, rows) {
            if(err)
              return done(err);
            rows.length.should.equal(1);
            rows[0].state.should.equal('enabled')
            done();
          });
        });
      });

      test('should return error when slave is down', function(done) {
        this.timeout(20000);
        slave_container.kill(function() {
          adapter.saveTask(task, function(err, inserted_id) {
            expect(err).to.be.an.instanceof(Error);
            done();
          });
        });
      });

      test('should remove task from master if slave verification is not successful', function(done) {
        this.timeout(5000);
        slave.query('STOP SLAVE', function(err) {
          adapter.saveTask(task, function(err, inserted_id) {
            master.query('SELECT * FROM gearsloth', function(err, rows) {
              rows.should.be.empty;
              done();
            });
          });
        });
      });
    });

    suite('updateTask', function() {

      test('should respect `after` field', function(done) {
        var task = {
          func_name: 'ebin'
        };

        var task_from_poll = {
          id: undefined,
          after: 500,
          func_name: 'ebin',
        };
        var task_id;

        async.series([
          function(callback) {
            adapter.saveTask(task, function(err, id) {
              task_from_poll.id = id;
              task_id = id;
              callback(err)
            });
          },
          function(callback) {
            adapter.updateTask(task_from_poll, callback);
          },
          function(callback) {
            var sql = 'SELECT * FROM gearsloth WHERE id = ? AND at > TIMESTAMPADD(SECOND, 490, UTC_TIMESTAMP())';
            master.query(sql, task_id, function(err, rows) {
              rows.should.not.be.empty;
              callback(err);
            });
          }
        ], done);
      });

    });
  });
});

function setupMultimaster (callback) {
  containers.multimaster_mysql(function(err, conf, master_c, slave_c) {
    if(err)
      return callback(err);

    master_container = master_c;
    slave_container = slave_c;

    conf.master.database = 'gearsloth';
    conf.slave.database = 'gearsloth';
    config = {
      dbopt: conf
    };

    master = mysql.createConnection(conf.master);
    slave = mysql.createConnection(conf.slave);

    callback();
  });
}

function cleanupMultimaster (callback) {
  master.destroy();
  slave.destroy();
  async.auto({
    master_kill: master_container.kill.bind(master_container),
    slave_kill: slave_container.kill.bind(slave_container),
    master_remove: ['master_kill', master_container.remove.bind(master_container)],
    slave_remove: ['slave_kill', slave_container.remove.bind(slave_container)]
  }, callback);
}
