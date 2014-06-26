var path = require('path');

exports.controllername = 'retry';

exports.server = {
  host: "localhost",
  port: 4730
};

exports.conf = {
  verbose: 0,
  db: 'sqlite',
  controllername: exports.controllername,
};

exports.conf_file = 'gearsloth.json';

exports.controllerfuncname = function(conf) {
  return conf.controllerfuncname ||
      path.basename(conf.controllername || exports.controllername, '.js') +
      'Controller';
};

var homedir = exports.homedir =
    process.env.HOME ||
    process.env.HOMEPATH ||
    process.env.USERPROFILE;

// config file paths in the order they are searched
var conf_paths = [];
conf_paths.push(process.cwd());                              // $PWD
if (homedir)
  conf_paths.push(path.join(homedir, '.gearsloth')); // $HOME/.gearsloth
conf_paths.push('/etc/gearsloth');                           // /etc/gearsloth
conf_paths.push(path.resolve(__dirname, '../..'));           // $PROJECT_ROOT

exports.conf_paths = conf_paths.map(function(p) {
  return path.join(p, exports.conf_file);
});
