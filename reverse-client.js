var Client = require('gearman-coffee').Client;

var client = new Client();

client.submitJob('reverse', 'kitteh').
on('complete', function(handle, data) {
  console.log(data.toString('utf-8'));
  client.disconnect();
});
