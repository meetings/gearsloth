var gearman = require('gearman-coffee')
  , ejector = require('../../lib/daemon/ejector')
  , sqlite = require('../../lib/adapters/sqlite')
  , child_process = require('child_process')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , parallel = require('async').parallel
  , _ = require('underscore');

chai.should();
chai.use(sinonChai);

suite('(e2e) ejector', function() {

  var gearmand
    , adapter
    , client;

  setup(function(done) {
    gearmand = child_process.spawn('gearmand');
    client = new gearman.Client();

    parallel({
      adapter: _.partial(sqlite.initialize, null),
      client: _.bind(client.on, client, 'connect')
    }, function(err, results) {
      if(err) {
        gearmand.kill();
      }
      adapter = results.adapter;
      done(err);
    });
  });

  teardown(function() {
    gearmand.kill();
  })

  test('should delete task from database', function() {
    var conf = { dbconn: adapter };
    //var completeSpy = sinon.spy(init.adapter, 'completeTask');


  });
});
