var os = require('os');

var ifaces = os.networkInterfaces();
ip = ifaces["eth0"];
console.log(ip);


	
