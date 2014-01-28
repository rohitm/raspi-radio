var http = require('http'),
	express = require("express"),
	helper = require('./custom_modules/helper.js');

helper.getVideosByYoutubeId('http://www.youtube.com/watch?v=JXgsEKA9934', function(resp){
	console.log(resp);
	for(i in resp.link){
		if(resp.link[i].type.format == 'mp4'){
			// Got the mp4 link
			var mp4link = resp.link[i].url;
			break;
		}
	}

	console.log(mp4link);
});

// Start a simple server
http.createServer(function (req, res) {
	req.on('data',function(data){
		console.log(data);	
	});
}).listen(8001);