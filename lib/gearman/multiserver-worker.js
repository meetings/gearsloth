function MultiserverWorker(servers, func_name, callback, Worker) {
  Worker = Worker ? Worker : require('gearman-coffee').Worker;

  if(!servers) {
    new Worker(func_name, callback);
  } else {
    servers.forEach(function(server) {
      new Worker(func_name, callback, server);
    });
  }
}

module.exports.MultiserverWorker = MultiserverWorker;
