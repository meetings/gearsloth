var gearsloth = require('../lib/gearsloth.js');
var Client = require('gearman-coffee').Client;

var client = new Client();

client.submitJob('submitJobDelayed', gearsloth.encodeTask(
  new Date(Date.now() + 1 * 1000).toISOString(),
  'log',
  new Buffer('kitteh', 'utf8')
)).
on('complete', function(handle, data) {
  client.disconnect();
});
