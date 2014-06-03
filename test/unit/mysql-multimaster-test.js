var mysql = require('mysql')
  , MySQLMultimaster = require('../../lib/adapters/mysql-multimaster')
  , chai = require('chai')
  , expect = chai.expect
  , sinon = require('sinon');

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


});