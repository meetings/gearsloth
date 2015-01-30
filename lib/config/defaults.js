var path = require('path');

exports.controllername = 'retry';

exports.server = {
  host: 'localhost',
  port: 4730
};

exports.conf = {
  verbose: 0,
  db: 'sqlite',
  controllername: exports.controllername
};

var conf_file = exports.conf_file = 'gearsloth.json';

exports.controllerfuncname = function(conf) {
  return conf.controllerfuncname ||
    path.basename(conf.controllername || exports.controllername, '.js') +
      'Controller';
};

var homedir = exports.homedir =
  process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE || '/';

/* config file paths in the order they are searched:
 * $PWD
 * $HOME/.gearsloth
 * /etc/gearsloth
 * $PROJECT_ROOT
 */
var conf_paths = [
  process.cwd(),
  path.join(homedir, '.gearsloth'),
  '/etc/gearsloth',
  path.resolve(__dirname, '../..')
];

exports.conf_paths = conf_paths.map(function(dir) {
  return path.join(dir, exports.conf_file);
});
