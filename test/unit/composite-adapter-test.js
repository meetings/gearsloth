var composite = require('../../lib/adapters/composite')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , expect = chai.expect;

chai.use(sinonChai);

suite('composite-adapter', function() {
  var sandbox = sinon.sandbox.create()
    , callback
    , config = {dbopt:[]}
    , config_helper = {}
    , adapters = [];

  setup(function() {
    callback = sandbox.spy();
    initSandbox();
  });
  teardown(function() {
    sandbox.restore();
  });

  suite('initialize()', function() {
    test('should call callback with error if dbopt is of invalid type', function() {
      var fake_config = {dbopt:{}};
      composite.initialize(fake_config, callback);
      expect(callback).to.have.been.calledOnce;
      expect(callback.args[0][0]).to.not.be.null;
    });
    test('should call callback with error if dbopt is empty', function() {
      var fake_config = {dbopt:[]};
      composite.initialize(fake_config, callback);
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
    test('saves a task to some database', function() {
      var task = {};
      var savetask_callback = sandbox.spy();
      dbconn.saveTask(task, savetask_callback);
      expect(adapters[0].saveTask).to.have.been.calledOnce;
      expect(adapters[0].saveTask).to.have.been.calledWith(task);
    });
    suite('on database error', function() {
      var dbconn;
      setup(function() {
        initSandbox();
        
        composite.initialize(
          config,
          function(e,dbconn_local) { dbconn = dbconn_local },
          config_helper);
        dbconn._databases[0].saveTask = sandbox.stub();
        dbconn._databases[0].saveTask.callsArgWith(1, new Error('dummy error, ignore'));
      });
      test('tries another database', function() {
        dbconn.saveTask({}, function() {});
        expect(dbconn._databases[0].saveTask).to.have.been.calledOnce;
        expect(dbconn._databases[1].saveTask).to.have.been.calledOnce;
        expect(dbconn._databases[2].saveTask).to.not.have.been.called;
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
      initSandbox();
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
      dbconn._databases.forEach(function(db) {
        expect(db.listenTask).to.have.been.calledOnce;
        expect(db.listenTask).to.have.been.calledWith(listentask_callback);
      });
    });
  });
  suite('updateTask()', function() {
    var dbconn;
    setup(function() {
      initSandbox();
      composite.initialize(
        config,
        function(e,dbconn_local) { dbconn = dbconn_local },
        config_helper);
    });

    teardown(function() {
      sandbox.restore();
    });
    
    test('calls updateTask() of correct adapter', function() {
      var callback = sandbox.spy();
      var task = {id:{db_id:2}};
      dbconn.updateTask(task, callback);
      expect(dbconn._databases[2].updateTask).to.have.been.calledOnce;
      expect(dbconn._databases[2].updateTask).to.have.been
      .calledWith(task, callback);
    });
  });
  suite('completeTask()', function() {
    var dbconn;
    setup(function() {
      initSandbox();
      composite.initialize(
        config,
        function(e,dbconn_local) { dbconn = dbconn_local },
        config_helper);
    });

    teardown(function() {
      sandbox.restore();
    });
    
    test('calls completeTask() of correct adapter', function() {
      var callback = sandbox.spy();
      var task = {id:{db_id:2}};
      dbconn.completeTask(task, callback);
      expect(dbconn._databases[2].completeTask).to.have.been.calledOnce;
      expect(dbconn._databases[2].completeTask).to.have.been
      .calledWith(task, callback);
    });
  });
  suite('disableTask()', function() {
    var dbconn;
    setup(function() {
      initSandbox();
      composite.initialize(
        config,
        function(e,dbconn_local) { dbconn = dbconn_local },
        config_helper);
    });

    teardown(function() {
      sandbox.restore();
    });
    
    test('calls disableTask() of correct adapter', function() {
      var callback = sandbox.spy();
      var task = {id:{db_id:2}};
      dbconn.completeTask(task, callback);
      expect(dbconn._databases[2].disableTask).to.have.been.calledOnce;
      expect(dbconn._databases[2].disableTask).to.have.been
      .calledWith(task, callback);
    });
  });
  suite('_findDbById()', function() {
    var dbconn;
    setup(function() {
      composite.initialize(
        config,
        function(e,dbconn_local) { dbconn = dbconn_local },
        config_helper);
    });
    test('returns null if database is not found', function() {
      expect(dbconn._findDbById(930)).to.be.null;
    });
    test('returns a correct database object', function() {
      expect(dbconn._findDbById(1))
      .to.have.property('db_id', 1);
    });
  });
  // helper function
  function initSandbox() {
    config_helper.initializeDb = sandbox.stub();
    for(var i = 0; i < 5; ++i) {
      config.dbopt.push({db:'sqlite'});
      var adapter = {db_id: i};
      adapter.saveTask = sandbox.spy();
      adapter.listenTask = sandbox.spy();
      adapter.updateTask = sandbox.spy();
      adapter.completeTask = sandbox.spy();
      adapters[i] = adapter;
      var aug_conf = {dbconn: adapter}
      config_helper.initializeDb.onCall(i).callsArgWith(1, null, aug_conf);
    }
  }
});

