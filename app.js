// Shit to do :
// 1. Software Goals
// TODO : Figure out how to stream this url : http://81.173.25.115:80/
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
	bodyParser = require('body-parser'),
	async = require('async');

var app = express();

var decoder;
var speaker;
var stream;
var currentStream={};


// Config
var env = process.env.NODE_ENV || 'development';
if ('development' == env) {
	app.use(bodyParser.json()); // for parsing application/json
	app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded	
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
	} else if(deep_exists(ifaces, 'wlan0', 0, 'address')){
		ip = ifaces["wlan0"][0]["address"];
	} else {
		ip = '/';
	}

	if(typeof(ip) == "undefined"){
		console.log("No Network Connection...");
		console.log(ifaces);
		return;
	}	

	app.locals.hostname = ip;
	app.locals.server_port = 8080;
	
	app.set('views', __dirname + '/templates');
	app.set('view engine', 'ejs');
	app.engine('ejs', require('ejs').renderFile);
}

app.get('/', function(req,res){
	var data = {};
	data.server_host_name = app.locals.hostname;
	data.server_port = app.locals.server_port;

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

app.get('/play/:genre', function(req, res){
	req.params.genre = req.params.genre.toLowerCase(); 

	async.waterfall([
		function(callback){
			if(typeof(currentStream.url) != "undefined"){
				// The radio is playing currently, stop it
				endStream(function(){
					callback(null, true);
				});
			} else {
				callback(null, false);
			}
		},
		function(radioStatus, callback){
			fs.readFile(__dirname + '/default_genres.json', 'utf8', function(err, data) {
				if(err) {
					return(callback({"status":500, "data":{"error":"Genre list not available"}}));
				}		

				var genres = JSON.parse(data);

				// Find the genre
				var genre = _.find(genres, {"name": req.params.genre});
				if(genre === undefined){
					return(callback({"status":500, "data":{"error":"Genre not found"}}));	
				}

				return(callback(null, genre.url));
			});
		},

		function(url, callback){
			// Play the url
			play(url, undefined, function(stream){
				if(typeof(stream.name) != "undefined"){
					return(callback(null, {"status":200, "data":{"current_stream":stream.name}}));
				} else{
					return(callback(null, {"status":200}));
				}
			});

		}
	],
	function(err, result){ 
		return(end(err || result, res));	
	});
});

app.get('/play_stop_last', function(req, res){
	if(typeof(currentStream.url) != "undefined"){
		// The radio is playing currently, stop it
		endStream(function(){
			end({"status":200},res);
		});
		return;
	}

	fs.readFile(__dirname + '/db.json', 'utf8', function(err, data) {
		if(err) {
			return(end({"status":500, "data":{"error":"I dont know what to play?"}},res));
		}
	  	
	  	file_obj = JSON.parse(data);

	  	if(typeof(file_obj.last_played_url) == "undefined"){
			return(end({"status":500, "data":{"error":"I dont know what to play?"}},res));
	  	}

		play(file_obj.last_played_url, undefined, function(stream){
			if(typeof(stream.name) != "undefined"){
				end({"status":200, "data":{"current_stream":stream.name}},res);
			} else{
				end({"status":200},res);
			}
		});
	});	
});

app.get('/stop',function(req, res){
	if(!isset(stream) && !isset(speaker) && !isset(decoder)) { return(end({"status":200},res)); }

	endStream(function(){
		end({"status":200},res);
	});
});

play = function(url, res, callback) {
	get({"url":url}, function(err, stream_url){
		if(err){
			return(end({"status":404},res));
		}
		
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
	if(isset(res) && !res.headerSent){
		res.writeHead(200, {"Content-Type": "application/json"});
		res.end(JSON.stringify(msg));	
	}
}

get = function(options, callback){
	var req = helper.followRedirectAndGet(options.url, function(error, resp){
		if(isset(options.encoding)){
			resp.setEncoding(options.encoding);
		}

		req.end();

		if(error || !isset(resp.headers['content-type'])){
			return(callback(true, null));
		}

		var contentType = resp.headers['content-type'];
		if(contentType == "audio/mpeg"){
			return(callback(null, resp.url));
		}

		// Failed to read the correct stream
		return(callback(true, null));
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
	if(!isset(stream) && !isset(speaker) && !isset(decoder)) { return; }
	
	if(isset(stream)){
		stream.destroy();	
	}
	
	stream = undefined;	
	decoder = undefined;
	currentStream = {};

	if(isset(speaker)){
		speaker.on('close', function(){
			speaker = undefined;
			if(typeof(callback) != "undefined"){
				callback();
			}
		});		
	} else {
		if(typeof(callback) != "undefined"){
			callback();
		}		
	}
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

var server = app.listen(app.locals.server_port);	