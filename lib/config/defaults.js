var path = require('path');

// default configurations

exports.server = {
  host: "localhost",
  port: 4730
};

exports.conf = {
  verbose: 0,
  db: 'sqlite',
  controllername: 'retry'
};

exports.conf_file = 'gearsloth.json';

// config file search paths in the order they are searched
exports.conf_paths = [
  process.cwd(),                    // $PWD (this could be unexpected)
  path.join(                        // $HOME/.gearsloth
      process.env.HOME ||
      process.env.HOMEPATH ||       // try to be cross-platform
      process.env.USERPROFILE,
      '.gearsloth'),
  '/etc/gearsloth',                 // /etc/gearsloth
  path.resolve(__dirname, '../..')  // $PROJECT_ROOT
]
.map(function(p) {
  return path.join(p, exports.conf_file);
});
