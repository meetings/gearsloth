var gearsloth   = require('./lib/gearsloth');
var config      = require('./config');

try {
  var init_msg = config.initialize(function(err, config) {
    if (config.worker) require('./worker')(config);
    if (config.runner) require('./runner')(config);
  });
  if (init_msg) {
    console.log(init_msg);
    process.exit(0);
  }
} catch (e) {
  console.error('gearslothd:', e.message);
  process.exit(1);
}

