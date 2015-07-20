// Shit to do :
// 1. Software Goals
// TODO : Figure out how to stream this url : http://87.98.216.129:3588/
// TODO : Figure out how itunes is able to stream all urls and the currently playing song names.
// TODO : Figure out a way to control volume with the alsa sound interface.
// TODO : Figure out way to play different codecs like AAC, OGG etc.
// TODO : Figure out how to assign a host name to the device so that it can be accessed from a local network.
// TODO : Design a local wifi connection Interface that automatically connects to the configured wifi network.
// TODO : Design a local DB either in memory K/V or a simple SQLlite kind of db to store recently played stations. (pagination).
// TODO : Run a pull off the internet for default radio stations.

// 2. Hardware Goals
// TODO : Figure how to do the basic "led" blink with the raspberry pi connected to a bread board.
// TODO : Figure out i/o with some kind of a LCD matrix display system. (Display song names etc).
// TODO : Figure out how to read physical button input from from the bread board.
// TODO : Use button inputs for volume, next station and previous station.
// TODO : Make the raspberry pi look retro and awesome. Metal container, buttons etc. <- We have a demo prototype at this point.

// Includes

var fs = require("fs"),
	http = require("http"),
	querystring = require('querystring'),
	application_root = __dirname,
	express = require("express"),
	path = require("path"),
	_ = require("underscore"),
	lame = require("lame"),
	Speaker = require("speaker"),
	os = require('os'),
	cors = require('express-cors'),
	helper = require('./custom_modules/helper.js'),
	bodyParser = require('body-parser');

var app = express();

var decoder;
var speaker;
var stream;
var currentStream={};


// Config
var env = process.env.NODE_ENV || 'development';
if ('development' == env) {
   	//app.use(bodyParser);
	app.use(app.router);
	app.use(express.static(path.join(application_root, "public")));

	app.use(cors({
	    allowedOrigins: [
	        'raspbmc', 'raspbian', '192.168.1.5'
	    ]
	}));

	// Start the server on the ip obtained by the local ethernet card or a wlan card.
	var ifaces = os.networkInterfaces();

	if(deep_exists(ifaces, 'eth0', 0, 'address')){
		ip = ifaces["eth0"][0]["address"];
	}

	if(deep_exists(ifaces, 'wlan0', 0, 'address')){
		ip = ifaces["wlan0"][0]["address"];
	}

	if(typeof(ip) == "undefined"){
		console.log("No Network Connection...");
		console.log(ifaces);
		return;
	}	

	app.set('hostname', ip);
	app.set('server_port', 8080);
	app.engine('.html', require('ejs').__express);
	app.set('views', __dirname + '/templates');
	app.set('view engine', 'html');	
}

app.get('/',function(req,res){
	var data = {};
	data.server_host_name = app.get('hostname');
	data.server_port = app.get('server_port');

	if(isset(currentStream.url)){
		data.stream_url = currentStream.url;
		data.stream_name = currentStream.name;
	}

	res.render("radio", data);
});

app.post('/read_stream', function(req, res){
	// If already playing dont bother
	if(isset(stream)) { end({"status":500,"reason":"already-playing! Stop it first"},res); return false; }

	if(!isset(req.body.url)) { end({"status":404},res); return false; }

	play(req.body.url, res);
});

app.get('/play_stop_last', function(req, res){
	if(typeof(currentStream.url) != "undefined"){
		// The radio is playing currently, stop it
		endStream(function(){
			res.end('Radio Stopped!');
		});
		return;
	}

	fs.readFile(__dirname + '/db.json', 'utf8', function(err, data) {
		if(err) {
			res.end('I dont know what to play?');
			return;
		}
	  	
	  	file_obj = JSON.parse(data);

	  	if(typeof(file_obj.last_played_url) == "undefined"){
			res.end('I dont know what to play?');
			return;	  		
	  	}

		play(file_obj.last_played_url, undefined, function(stream){
			if(typeof(stream.name) != "undefined"){
				res.end('Now playing : '+stream.name);
			} else{
				res.end('Playing the last played station');
			}
		});
	});	
});

app.get('/stop',function(req, res){
	if(!isset(stream) || !isset(speaker) || !isset(decoder)) { end({"status":200},res); return; }

	endStream(function(){
		end({"status":200},res);
	});
});

play = function(url, res, callback) {
	get({"url":url}, function(stream_url){
		// This streaming engine only parses octect streams
		readStream(stream_url, function(resp){
			currentStream.url = stream_url;
			if(isset(resp.headers['icy-name'])){
				currentStream.name = resp.headers['icy-name'];
			} else {
				currentStream.url = stream_url;
			}

			// Save this url to a file for persistance.
			var file_obj = {};
			file_obj.last_played_url = stream_url;
			fs.writeFile("db.json", JSON.stringify(file_obj)); 

			if(typeof(res) != "undefined"){
				end({"status":200, "data":{"streamInfo":currentStream}},res);
			}

			if(typeof(callback) != "undefined"){
				callback(currentStream);
			}

			decoder = new lame.Decoder();
			resp.pipe(decoder);

			decoder.on('format', function(format){
				//console.log(format);
				speaker = new Speaker(format);
				this.pipe(speaker);
			});			
		});
	});	
}

end = function(msg, res){
	if(isset(res)){
		res.writeHead(200, {"Content-Type": "application/json"});
		res.end(JSON.stringify(msg));	
	}
}

get = function(options, callback){
	/*var req = http.get(options.url, function(resp){*/
	var req = helper.followRedirectAndGet(options.url, function(error, resp){
		if(isset(options.encoding)){
			resp.setEncoding(options.encoding);
		}

		if(error){
			req.end();
			return;
		}

		if(!isset(resp.headers['content-type'])){
			req.end();
		}

		var contentType = resp.headers['content-type'];
		if(contentType == "audio/mpeg"){
			callback(resp.url);
			req.end();
			return;
		}

		// Failed to read the correct stream, 
		req.end();
		return;
	});
}

readStream = function(url, callback_data, callback_end){
	stream = http.get(url, function(resp){
		callback_data(resp);

		resp.on('end',function(){
			if(isset(callback_end)){
				callback_end();
			}
		});

		resp.on('error', function(){
			endStream();
		});	
	});

	stream.on('end', function(){
		endStream();
	});

	stream.on('error', function(){
		endStream();
	});	
}

endStream = function(callback){
	if(!isset(stream) || !isset(speaker) || !isset(decoder)) { return; }
	stream.destroy();

	speaker.on('close', function(){
		stream = undefined;
		decoder = undefined;
		speaker = undefined;
		currentStream = {};
		if(typeof(callback) != "undefined"){
			callback();
		}
	});
}

isset = function(obj){
	if(typeof(obj)=="undefined") { return false; }
	else { return true; }
}

function deep_exists(obj) {
  var args = Array.prototype.slice.call(arguments, 1);

  for (var i = 0; i < args.length; i++) {
    if (!obj || !obj.hasOwnProperty(args[i])) {
      return false;
    }
    obj = obj[args[i]];
  }
  return true;
}

process.on('uncaughtException', function(err) {
	console.log('Caught exception: ' + err.stack);
});

app.listen(app.get('server_port'));