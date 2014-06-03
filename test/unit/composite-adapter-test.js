var composite = require('../../lib/adapters/composite')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , expect = chai.expect;

chai.use(sinonChai);

suite('composite-adapter', function() {
  var sandbox = sinon.sandbox.create()
    , callback
    , config = {}
    , bad_config = {}
    , config_helper = {}
    , good_config = [{
        db: 'sqlite',
        db_id: 'sqlite://sqlite.db'
      },{
        db: 'sqlite',
        db_id: 'sqlite://sqlite2.db'
      }];

  setup(function() {
    callback = sandbox.spy();

    config.dbopt = good_config;

    augmented_conf = config;
    augmented_conf.dbconn = {};
    augmented_conf.dbmodule = {};

    augmented_conf.dbconn.saveTask = sandbox.spy();
    augmented_conf.dbconn.listenTask = sandbox.spy();
    config_helper.initializeDb = sinon.stub();
    config_helper.initializeDb.callsArgWith(1, null, augmented_conf);

  });
  teardown(function() {
    sandbox.restore();
  });
  suite('initialize()', function() {
    test('should call callback with error if dbopt is of invalid type', function() {
      config.dbopt = bad_config;
      composite.initialize(config, callback);
      expect(callback).to.have.been.calledOnce;
      expect(callback.args[0][0]).to.not.be.null;
    });
    test('should call callback with no error if everything goes smoothly', function() {
      composite.initialize(config, callback, config_helper);
      expect(callback).to.have.been.calledOnce;
      expect(callback.args[0][0]).to.be.null;
    });
    test('populates _databases array correctly', function() {
      composite.initialize(config, callback, config_helper);
      var _databases = callback.args[0][1]._databases;
      expect(_databases[0]).to.have.property('db_id');
      expect(_databases[1]).to.have.property('db_id');
      expect(_databases[0]).to.have.property('dbconn');
      expect(_databases[1]).to.have.property('dbconn');
    });
  });
  suite('saveTask()', function() {
    var dbconn;
    setup(function() {
      composite.initialize(
        config,
        function(e,dbconn_local) { dbconn = dbconn_local },
        config_helper);
    });

    teardown(function() {
      sandbox.restore();
    });
    test('saves a task to a random database', function() {
      var task = {};
      var savetask_callback = sandbox.spy();
      dbconn.saveTask(task, savetask_callback);
      expect(augmented_conf.dbconn.saveTask).to.have.been.calledOnce;
      expect(augmented_conf.dbconn.saveTask).to.have.been.calledWith(task);
    });
    suite('on database error', function() {
      setup(function() {
        augmented_conf.dbconn.saveTask = sandbox.stub();
        augmented_conf.dbconn.saveTask.callsArgWith(1, new Error('dummy error, ignore'));
        config_helper.initializeDb = sinon.stub();
        config_helper.initializeDb.callsArgWith(1, null, augmented_conf);
        composite.initialize(
          config,
          function(e,dbconn_local) { dbconn = dbconn_local },
          config_helper);
      });
      test('tries another database', function() {
        dbconn.saveTask({}, function() {});
        expect(augmented_conf.dbconn.saveTask).to.have.been.calledTwice;
      });
      test('calls callback with error if _databases contains no dbs', function() {
        dbconn._databases = new Array();
        var savetask_callback = sandbox.spy();
        dbconn.saveTask({}, savetask_callback);
        expect(savetask_callback.args[0][0]).to.be.an.instanceof(Error);
      });
      test('seizes if failcounter exceeds number of dbs', function() {
        var savetask_callback = sandbox.spy();
        dbconn.saveTask({}, savetask_callback, dbconn._databases.length)
        expect(savetask_callback).to.have.been.calledOnce;
        expect(savetask_callback.args[0][0]).to.be.an.instanceof(Error);
      });
    });
  });

  suite('listenTask()', function() {
    var dbconn;
    setup(function() {
      composite.initialize(
        config,
        function(e,dbconn_local) { dbconn = dbconn_local },
        config_helper);
    });

    teardown(function() {
      sandbox.restore();
    });
    
    test('registers callback to all db adapters', function() {
      var listentask_callback = sandbox.spy();
      dbconn.listenTask(listentask_callback);
      expect(augmented_conf.dbconn.listenTask).to.have.been.calledTwice;
      expect(augmented_conf.dbconn.listenTask)
      .to.have.been.calledWith(listentask_callback);
    });
  });
});

