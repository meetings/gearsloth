function initialize(servers, func_name, callback) {
  return new Multiserver(
    servers,
    func_name,
    require('gearman-coffee'));
}

function Multiserver(servers, func_name, callback, gearman) {
  this._servers = servers;
  this._func_name = func_name;
  this._callback = callback;
}

module.exports.Multiserver = Multiserver;
