var Client = require('gearman-coffee').Client;
var gearsloth = require('../lib/gearsloth');

var task = {
  at: new Date() + 1000,
  func_name: 'log',
  payload: 'kitteh'
};

var client = new Client();
client.submitJob('submitJobDelayed', JSON.stringify(task));
