var gearsloth   = require('./lib/gearsloth');
var config      = require('./config');

config.initialize(function(err, config) {
  if (config.worker) require('./worker')(config);
  if (config.runner) require('./runner')(config);
});

