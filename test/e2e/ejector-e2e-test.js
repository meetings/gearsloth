var gearman = require('gearman-coffee');
var child_process = require('child_process');

suite('', function() {

  var gearmand;
  var client;

  setup(function(done) {
    gearmand = child_process.spawn('gearmand');
    client = new gearman.Client().on('connect', done); // make sure gearmand is running
  });

  teardown(function() {
    gearmand.kill();
  })

  suite('', function() {
    test('', function() {
    });
  });
});