function MultiserverClient(servers, Client, random) {
  Client = Client ? Client : require("gearman-coffee").Client;
  random = random ? random : Math.random;

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

module.exports.MultiserverClient = MultiserverClient;
