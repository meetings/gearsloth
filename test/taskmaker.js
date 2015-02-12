#!/usr/bin/nodejs

/* Taskmaker lets you generate and feed tasks into Gearsloth system.
 * Useful for stress testing. Number of generated tasks, interval
 * between feeding tasks and task delays are configurable.
 *
 * Usage:
 *  $ npm install gearman-node
 *  $ nodejs stresstest.js <nro> <interval> <delay>
 */

var util = require('util')
var gearman = require('gearman-node')
var client = new gearman.Client()

var conf = {}
var workern = 0
var workerf = '_worker_v' + Math.floor(Math.random() * (990) + 10)

function registerWorker() {
  var worker = new gearman.Worker(workerf, function(payload, worker) {
    if (payload !== null) {
      workern += 1
      util.print(' ' + workern)
    }
    else {
      util.puts('no payload')
    }
    return worker.complete()
  })
}

function newJob(payload) {
  var task = JSON.stringify({
    func_name: workerf,
    after:     conf.delay,
    payload:   payload
  })

  client.submitJob('submitJobDelayed', task)
  .on('created', function() {
    util.print('<')
  })
  .on('complete', function(handle, data) {
    util.print('>')
  })
}

function createJobs() {
  for (var i=0; i<conf.tasks; i++) {
    setTimeout(function() {
      newJob(new Date())
    }, conf.interval)
  }
}

(function(l, i, d) {
  conf = {
    tasks: l || 1,
    delay: d || 2,
    interval: i || 10
  }
}).apply(this, process.argv.slice(2))

util.puts('Registering gearman worker: ' + workerf)
registerWorker()

util.puts('Number of tasks:            ' + conf.tasks)
util.puts('Task feed interval (ms):    ' + conf.interval)
util.puts('Task execution delay:       ' + conf.delay)
createJobs()

setInterval(function() {
  if (workern >= conf.tasks) {
    util.puts('\nOK')
    process.exit(0)
  }
}, 3333)
