function initialize(servers, func_name, callback) {
  return new MultiserverWorker(
    servers,
    func_name,
    require('gearman-coffee').Worker);
}

function MultiserverWorker(servers, func_name, callback, Worker) {
  if(!servers) {
    new Worker(func_name, callback);
  } else {
    servers.forEach(function(server) {
      new Worker(func_name, callback, server);
    });
  }
}

module.exports = initialize;
module.exports.MultiserverWorker = MultiserverWorker;
