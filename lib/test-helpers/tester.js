var async = require('async');
var gearman = require('gearman-node');

// default test function name
var test_func_name = 'test';

function gearmanOptions(port) {
  return {
    host: 'localhost',
    port: port
  };
}

function Tester(port, done) {
  var that = this;
  this._test_func = function() {};
  this.test_func_name = test_func_name;
  async.parallel([
    function(callback) {
      that._worker = new gearman.Worker(that.test_func_name,
          function(payload, worker) {
        that._test_func(payload);
        worker.complete();
      }, gearmanOptions(port));
      that._worker.on('connect', callback);
    },
    function(callback) {
      that._client = new gearman.Client(gearmanOptions(port));
      that._client.on('connect', callback);
    }
  ], function() {
    done();
  });
}

Tester.prototype.test = function(test_payload, test_func) {
  this._test_func = test_func;
  this._client.submitJob(this.test_func_name, test_payload);
};

Tester.prototype.testDelayed = function(test_json, test_func) {
  this._test_func = test_func;
  this._client.submitJob('submitJobDelayed', JSON.stringify(test_json));
};

Tester.prototype.disconnect = function(done) {
  var that = this;
  async.parallel([
    function(callback) {
      that._client.socket.on('close', callback);
      that._client.disconnect();
    },
    function(callback) {
      that._worker.socket.on('close', callback);
      that._worker.disconnect();
    }
  ], function() {
    done();
  });
};

module.exports = function(port, done) {
  return new Tester(port, done);
};
module.exports.Tester = Tester;
