var mysql = require('mysql')
  , MySQLMultimaster = require('../../lib/adapters/mysql-multimaster')
  , chai = require('chai')
  , expect = chai.expect
  , sinon = require('sinon')
  , any = sinon.match.any
  , sinonchai = require('sinon-chai');

chai.should();
chai.use(sinonchai);

suite('MySQL Multimaster adapter', function() {
  
  var config = {
    host: 'example',
    user: 'example_user',
    password: 'example_secret'
  };
  var sandbox = sinon.sandbox.create();

  setup(function() {
    sandbox.stub(mysql);
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

      var mysql_conn = {
        connect: sinon.stub().callsArgWith(0, null, successful_example_connect)
      };

      mysql.createConnection.returns(mysql_conn);

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

      var mysql_conn = {
        connect: sinon.stub().callsArgWith(0, error)
      };

      mysql.createConnection.returns(mysql_conn);

      var multimaster = MySQLMultimaster.initialize(config, function(err, adapter) {
        expect(err).to.equal(error);
        expect(adapter).to.be.undefined;
        done();
      });
    });
  });

  suite('saveTask', function() {

    var mysql_conn, adapter;

    setup(function() {
      mysql_conn = {
        query: sandbox.stub().callsArgWith(2, null, 666)
      };

      mysql.createConnection.returns(mysql_conn);
      adapter = new MySQLMultimaster.MySQLMultimaster(config);
    });

    test('with { func_name: "ebin" } should call query correctly', function(done) {
      var task = {
        func_name: 'ebin'
      };
      var task_to_insert = {
        at: new Date(),
        task: JSON.stringify(task)
      };

      adapter.saveTask(task, function(err, id) {
        mysql_conn.query
          .should.have.been.calledWith(any, task_to_insert);
        done();
      });
    });

    test('with { func_name: "ebin", at: "2014-06-07" } should call query correctly', function(done) {
      var task = {
        func_name: 'ebin',
        at: new Date('2014-06-07')
      };
      var task_to_insert = {
        at: new Date('2014-06-07'),
        task: JSON.stringify(task)
      };

      adapter.saveTask(task, function(err, id) {
        mysql_conn.query
          .should.have.been.calledWith(any, task_to_insert);
        done();
      });
    });

    test('with { func_name: "ebin", after: 10 } should call query correctly', function(done) {
      var task = {
        func_name: 'ebin',
        after: 10
      };
      var after = new Date( new Date().getTime() + 10000 );
      var task_to_insert = {
        at: after,
        task: JSON.stringify(task)
      };

      adapter.saveTask(task, function(err, id) {
        mysql_conn.query
          .should.have.been.calledWith(any, task_to_insert);
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
        at: after,
        task: JSON.stringify(task)
      };

      adapter.saveTask(task, function(err, id) {
        mysql_conn.query
          .should.have.been.calledWith(any, task_to_insert);
        done();
      });
    });

  });

  suite('completeTask', function() {

    var mysql_conn, adapter;

    setup(function() {
      mysql_conn = {
        query: sandbox.stub().callsArgWith(2, null, 1)
      };

      mysql.createConnection.returns(mysql_conn);
      adapter = new MySQLMultimaster.MySQLMultimaster(config);
    });

    test('should call query correctly', function(done) {

      var task = {
        id: 100,
        func_name: 'ebin',
        after: 10
      };
      var task_to_delete = {
        id: 100
      };

      adapter.completeTask(task, function(err, rows) {
        mysql_conn.query
          .should.have.been.calledWith(any, task_to_delete);
        done();
      });
    });

  });

});
