function initialize(servers) {
  return new MultiserverClient(
      servers,
      require("gearman-coffee").Client,
      Math.random);
}

function MultiserverClient(servers, Client, random) {
  var clients = [];
  if(!servers)
    return new Client();
  servers.forEach(function(server) {
    clients.push(new Client(server));
  });

  this.submitJob = function(func_name, payload) {
    var index = Math.floor(random()*clients.length);
    return clients[index].submitJob(func_name, payload);
  }
}


module.exports = initialize;
module.exports.MultiserverClient = MultiserverClient;
