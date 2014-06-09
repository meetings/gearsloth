var mysql = require('mysql')
  , MySQLMultimaster = require('../../lib/adapters/mysql-multimaster')
  , chai = require('chai')
  , expect = chai.expect
  , sinon = require('sinon')
  , any = sinon.match.any
  , sinonchai = require('sinon-chai')
  , EventEmitter = require('events').EventEmitter;

chai.should();
chai.use(sinonchai);

suite('MySQL Multimaster adapter', function() {
  
  var config = {
    host: 'example',
    user: 'example_user',
    password: 'example_secret'
  };
  var sandbox = sinon.sandbox.create();
  var mysql_conn;

  setup(function() {
    sandbox.stub(mysql, 'createConnection');
    mysql_conn = {
      connect: sinon.stub(),
      query: sandbox.stub(),
      beginTransaction: sandbox.stub(),
      commit: sandbox.stub(),
      rollback: sandbox.stub(),
      on: function() {}
    };

    mysql.createConnection.returns(mysql_conn);
  });

  teardown(function() {
    sandbox.restore();
  });

  suite('initialize', function() {

    test('should create adapter', function(done) {
      var successful_example_connect = { 
        fieldCount: 0,
        affectedRows: 0,
        insertId: 0,
        serverStatus: 2,
        warningCount: 0,
        message: '',
        protocol41: true,
        changedRows: 0 
      };

      mysql_conn.connect.callsArgWith(0, null, successful_example_connect);

      var multimaster = MySQLMultimaster.initialize(config, function(err, adapter) {
        expect(err).to.be.null;
        expect(adapter).to.not.be.null;
        done();
      });
    });

    test('passes error correctly', function(done) {
      var error = new Error({ 
        code: 'ER_ACCESS_DENIED_ERROR',
        errno: 1045,
        sqlState: '28000',
        fatal: true 
      });

      mysql_conn.connect.callsArgWith(0, error)

      var multimaster = MySQLMultimaster.initialize(config, function(err, adapter) {
        expect(err).to.equal(error);
        expect(adapter).to.be.undefined;
        done();
      });
    });
  });

  suite('saveTask', function() {

    var adapter;

    setup(function() {
      mysql_conn.query.callsArgWith(2, null, 666)
      adapter = new MySQLMultimaster.MySQLMultimaster(config);
    });

    test('with { func_name: "ebin" } should call query correctly', function(done) {
      var task = {
        func_name: 'ebin'
      };
      var task_to_insert = {
        task: JSON.stringify(task)
      };
      var sql_expectation = sinon.match('at = UTC_TIMESTAMP()');

      adapter.saveTask(task, function(err, id) {
        mysql_conn.query
          .should.have.been.calledWith(sql_expectation, task_to_insert);
        done();
      });
    });

    test('with { func_name: "ebin", at: "2014-06-07" } should call query correctly', function(done) {
      var task = {
        func_name: 'ebin',
        at: new Date('2014-06-07')
      };
      var task_to_insert = {
        task: JSON.stringify(task)
      };
      var sql_expectation = sinon.match('at = ' + mysql.escape(task.at));

      adapter.saveTask(task, function(err, id) {
        var task
        mysql_conn.query
          .should.have.been.calledWith(sql_expectation, task_to_insert);
        done();
      });
    });

    test('with { func_name: "ebin", after: 10 } should call query correctly', function(done) {
      var task = {
        func_name: 'ebin',
        after: 10
      };
      var task_to_insert = {
        task: JSON.stringify(task)
      };
      var sql_expectation = sinon.match('at = TIMESTAMPADD(SECOND, 10, UTC_TIMESTAMP())');

      adapter.saveTask(task, function(err, id) {
        mysql_conn.query
          .should.have.been.calledWith(sql_expectation, task_to_insert);
        done();
      });
    });

    test('with { func_name: "ebin", after: "100" } should call query correctly', function(done) {
      var task = {
        func_name: 'ebin',
        after: "100"
      };
      var after = new Date( new Date().getTime() + 100000 );
      var task_to_insert = {
        task: JSON.stringify(task)
      };
      var sql_expectation = sinon.match('at = TIMESTAMPADD(SECOND, 100, UTC_TIMESTAMP())');

      adapter.saveTask(task, function(err, id) {
        mysql_conn.query
          .should.have.been.calledWith(sql_expectation, task_to_insert);
        done();
      });
    });

  });

  suite('completeTask', function() {

    var adapter;

    setup(function() {
      mysql_conn.query.callsArgWith(2, null, 1)
      adapter = new MySQLMultimaster.MySQLMultimaster(config);
    });

    test('should call query correctly', function(done) {

      var task = {
        id: {
          task_id: 666
        },
        func_name: 'ebin',
        after: 10
      };
      var task_to_delete = {
        id: 666
      };

      adapter.completeTask(task, function(err, rows) {
        mysql_conn.query
          .should.have.been.calledWith(any, task_to_delete);
        done();
      });
    });

  });

  suite('listenTask', function() {

    var adapter;

    setup(function() {
      mysql_conn.beginTransaction.yields(null),
      mysql_conn.commit.yields(null),

      adapter = new MySQLMultimaster.MySQLMultimaster(config);
    });

    test('should return function to remove listener', function() {
      var adapter = new MySQLMultimaster.MySQLMultimaster({});
      var listener = function() {};

      var remover = adapter.listenTask(listener);
      adapter._listener.should.equal(listener);
      remover();
      expect(adapter._listener).to.be.null;
    });

    suite('poller', function() {

      var clock;

      setup(function() {
        clock = sinon.useFakeTimers();
      });

      teardown(function() {
        clock.restore();
      });

      test("doesn't call listener if no rows are returned" , function(done) {
        mysql_conn.query.yields(null, [], null);

        var listenerSpy = sandbox.spy();
        adapter.listenTask(listenerSpy);

        setTimeout(function() {
          mysql_conn.query.should.have.been.calledThrice;
          listenerSpy.should.not.have.been.called;
          done();
        }, 1500);

        clock.tick(1600);
      });

      test('sets task.first_run on the first run');
  
      test('polls every second by default', function() {
        var pollSpy = sandbox.spy(adapter, '_poll');

        adapter.listenTask(sandbox.stub());

        clock.tick(2500);
        pollSpy.should.have.been.calledTwice;
      });

      test('stops polling after listener disconnected', function() {
        var pollSpy = sandbox.spy(adapter, '_poll');

        var listenerRemover = adapter.listenTask(sandbox.stub());

        clock.tick(2500);
        listenerRemover();
        clock.tick(1000);
        pollSpy.should.have.been.calledTwice;
      });

      test('calls listener with correct task', function() {
        var task = {
          id: {
            task_id: 13
          },
          at: sinon.match.date,
          func_name: "eebenpuu",
          after: 100
        };

        var listener = sandbox.spy();
        adapter.listenTask(listener);

        var task_from_db = {
          id: 13,
          at: new Date(),
          task: '{"func_name":"eebenpuu","after":100}'
        };
        mysql_conn.query.yields(null, [task_from_db], null);

        clock.tick(1500);

        listener.should.have.been.calledOnce;
        listener.should.have.been.calledWith(null, task);
      });

      test("rolls back and doesn't call listener on error", function() {
        adapter._listener = sandbox.spy();
        mysql_conn.query.yields(new Error());

        adapter._poll();

        mysql_conn.rollback.should.have.been.calledOnce;
        adapter._listener.should.not.have.been.called;
      });

    });
  });
  suite("connected", function() {
    var mysql_conn, adapter, error;

    var successful_example_connect = { 
      fieldCount: 0,
      affectedRows: 0,
      insertId: 0,
      serverStatus: 2,
      warningCount: 0,
      message: '',
      protocol41: true,
      changedRows: 0 
    };

    setup(function() {
      mysql_conn = new EventEmitter();
      mysql_conn.connect = sinon.stub().callsArgWith(0, null, successful_example_connect);
      mysql.createConnection.returns(mysql_conn);
      adapter = new MySQLMultimaster.MySQLMultimaster(config);
    });

    test("should be false before connecting", function() {
      adapter.connected.should.be.false;
    });

    test("should be true after connecting", function() {
      MySQLMultimaster.initialize(config, function(err, adapter1) {
        adapter1.connected.should.be.true;
      });
    });

    test("should be false when connection is lost", function() {
      var ad;
      MySQLMultimaster.initialize(config, function(err, adapter1) {
        ad = adapter1;
      });
      mysql_conn.connect = sinon.stub().callsArgWith(0, new Error());
      mysql_conn.emit('error', {
        code: 'PROTOCOL_CONNECTION_LOST'
      });
      ad.connected.should.be.false;
    });

    test("should be true after reconnecting", function() {
      mysql_conn.emit('error', {
        code: 'PROTOCOL_CONNECTION_LOST'
      });
      adapter.connected.should.be.true;
    });

  });

  suite("reconnecting", function() {
    setup(function() {
      mysql_conn = new EventEmitter();
      mysql.createConnection.returns(mysql_conn);
      adapter = new MySQLMultimaster.MySQLMultimaster(config);
    });

    teardown(function() {
      sandbox.restore();
    });

    test("should be done when connection is lost", function(done) {
      this.timeout(500);
      mysql.createConnection.returns({
        connect:function() { done() }
      });
      mysql_conn.emit('error', {
        code: 'PROTOCOL_CONNECTION_LOST'
      });
    });
    
  });

  suite('updateTask', function() {
    var adapter;

    setup(function() {
      mysql_conn.query.callsArgWith(2, null, { affectedRows: 1 })
      adapter = new MySQLMultimaster.MySQLMultimaster(config);
    });

    test('should update at', function() {
      var task = {
        id: {
          db_id: 'asdf://foo',
          task_id: 53
        },
        at: new Date('2014-05-22'),
        func_name: 'asdf'
      }
      var values = {
        at: new Date('2014-05-22'),
        task: JSON.stringify({
          at: new Date('2014-05-22'),
          func_name: 'asdf'
        })
      }
      var where = {
        id: 53
      }

      adapter.updateTask(task, function(err, rows) {
        expect(err).to.be.null;
        rows.should.be.equal(1);

        mysql_conn.query
          .should.have.been.calledWith(any, [values, where]);
      });
    });
  });

});
