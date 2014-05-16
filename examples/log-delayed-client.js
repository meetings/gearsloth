var EventEmitter = require('events').EventEmitter;
var gearsloth = require('../lib/gearsloth.js');
var Client = require('gearman-coffee').Client;

var client = new Client();
var i = 2;
function disconnect() {
  if (--i === 0)
    client.disconnect();
}

// using high level API with gearsloth.encodeTask

client.submitJob('submitJobDelayed', gearsloth.encodeTask(
  Date.now() + 1000, 'log', 'kitteh'
)).
on('complete', disconnect);

// using low level API with regular gearman arguments

var job = new EventEmitter();
job.on('complete', disconnect);
client.queue.push(job);

client.sendCommand('SUBMIT_JOB', 'submitJobDelayed', false,
  new Date(Date.now() + 800).toISOString(), 'log', 'kitteh2');
