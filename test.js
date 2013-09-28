var os = require('os');

var ifaces = os.networkInterfaces();
ip = ifaces["eth0"][1]["address"];
	
