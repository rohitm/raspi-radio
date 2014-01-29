var http = require('http'),
	https = require('https'),
	URL = require('url'),
	querystring = require('querystring');

module.exports.getHeaders = function(url, success_callback){
	url = URL.parse(url);
	var options = {
    	host: url.host,
    	method: "HEAD"
	};

	options.port = 80;
	if(url.port != null){
		options.port = url.port
	} 

	if(url.path != null){
		options.path = url.path
	}

	var request = http.get(url, function(resp) {
		if(typeof(resp.headers) == "object"){
			success_callback(resp.headers);
		}
	});
}

module.exports.getResponse = function(url, callback){
	url = URL.parse(url);
	var options = {
    	host: url.host,
    	method: "GET"
	};

	options.port = 80;
	if(url.port != null){
		options.port = url.port
	} 

	if(url.path != null){
		options.path = url.path
	}	

	var request = http.get(options, function(resp) {
		var StringDecoder = require('string_decoder').StringDecoder;
		var decoder = new StringDecoder('utf8');
		var chunks=[];
		resp.on('data', function(chunk){
			chunks.push(decoder.write(chunk));
		}).on('end',function(){
			callback(chunks.toString());
		});	
	});
}

module.exports.getVideosByYoutubeId = function(url, callback){
	var id = url.match(/(\?|&)v=([^&]+)/).pop();
	var url = "https://ytgrabber.p.mashape.com/app/get/"+id;
	url = URL.parse(url);
	var options = {
    	host: url.host,
    	method: "GET",
    	headers: { "X-Mashape-Authorization": "bAoHOko6olxr2kGeZxOBCzL2xCoUJvVU" }
	};

	if(url.path != null){
		options.path = url.path
	}	

	var request = https.get(options, function(resp) {
		var StringDecoder = require('string_decoder').StringDecoder;
		var decoder = new StringDecoder('utf8');
		var chunks=[];
		resp.on('data', function(chunk){
			chunks.push(decoder.write(chunk));
		}).on('end',function(){
			callback(JSON.parse(chunks.toString()));
		});	
	});
}

followRedirectAndGet = function(address, callback){
	if(typeof(callback) == "undefined"){ 
		callback(true, undefined);
		return;
	}

	var url_obj = URL.parse(address);
	if(typeof(url_obj.host) == "undefined" || typeof(url_obj.path) == undefined){
		callback(true, undefined);
		return;
	}

	var options = {
	    headers: {
	        'User-Agent': 'iceberry/v1.0',
	    }
	};

	options.host = url_obj.host;
	options.path = url_obj.path;

	var req = http.get(options, function(resp){
		if(typeof(resp.headers.location) == "undefined"){
			resp.url = address;
			callback(false, resp);
			return;
		}

		followRedirectAndGet(resp.headers.location, callback);
	}).on('error', function(e){
		callback(true, undefined);	
	});

	return(req);
}

module.exports.followRedirectAndGet = followRedirectAndGet;
