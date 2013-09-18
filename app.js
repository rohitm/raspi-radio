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
	os = require('os');

var app = express();

var decoder;
var speaker;
var stream;
var currentStream={};


// Config
app.configure(function() {
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(application_root, "public")));
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

	var hostname = os.hostname();
	if(hostname.length > 0){
		app.set('hostname', os.hostname());
	} else {
		app.set('hostname', 'localhost');
	}

	app.set('hostname', 'localhost');

	app.set('server_port', 8080);

	app.engine('.html', require('ejs').__express);
	app.set('views', __dirname + '/templates');
	app.set('view engine', 'html');	
});

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

	get({"url":req.body.url}, function(stream_url){
		// This streaming engine only parses octect streams
		readStream(stream_url, function(resp){
			currentStream.url = stream_url;
			if(isset(resp.headers['icy-name'])){
				currentStream.name = resp.headers['icy-name'];
			} else {
				currentStream.url = stream_url;
			}

			end({"status":200, "data":{"streamInfo":currentStream}},res);

			decoder = new lame.Decoder();
			resp.pipe(decoder);

			decoder.on('format', function(format){
				//console.log(format);
				speaker = new Speaker(format);
				this.pipe(speaker);
			});			
		});
	});
});

app.get('/stop',function(req, res){
	if(!isset(stream) || !isset(speaker) || !isset(decoder)) { end({"status":200},res); return; }

	stream.end();
	speaker.close();
	stream = undefined;
	decoder = undefined;
	speaker = undefined;
	currentStream = {};

	end({"status":200},res);
});

end = function(msg, res){
	if(isset(res)){
		res.writeHead(200, {"Content-Type": "application/json"});
		res.end(JSON.stringify(msg));	
	}
}

get = function(options, callback){
	var req = http.get(options.url, function(resp){
		if(isset(options.encoding)){
			resp.setEncoding(options.encoding);
		}

		console.log(resp.headers);
		if(!isset(resp.headers['content-type'])){
			req.end();
		}

		var contentType = resp.headers['content-type'];
		if(contentType == "application/octet-stream"){
			callback(resp.headers.location);
			req.end();
			return;
		}

		if(contentType == "audio/mpeg"){
			callback(options.url);
			req.end();
			return;
		}
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
	});
}

isset = function(obj){
	if(typeof(obj)=="undefined") { return false; }
	else { return true; }
}

app.listen(app.get('server_port'));
