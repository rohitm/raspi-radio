var http = require('http'),
	express = require("express"),
	helper = require('./custom_modules/helper.js'),
	Speaker = require("speaker"),
	lame = require("lame"),
	_ = require("underscore"),
	Stream = require('stream');

var console_ffmepg_cmd = "~/Desktop/ffmpeg -i '<%= link %>' -vn -ar 44100 -ac 2 -ab <%= encoding_rate %> -f ogg http://localhost:8001";

helper.getVideosByYoutubeId('http://www.youtube.com/watch?v=XjTSpgAm8QM', function(resp){
	if(typeof(resp.error) != "undefined" && resp.error != null){
		console.log(resp.error.code);
		return;
	}

	for(i in resp.links){
		// Just play from the first link
		var mp4link = resp.links[i].url;
		break;
	}

	for(i in resp.link){
		if(resp.link[i].type.format == 'mp4'){
			// Got the mp4 link
			var mp4link = resp.link[i].url;
			break;
		}
	}

	var ffmpeg_cmd = _.template(console_ffmepg_cmd, {link:mp4link, encoding_rate:"196608"});
	var terminal = require('child_process').spawn('bash');

	terminal.stdout.on('data', function (data) {
	    console.log('stdout: ' + data);
	});

	terminal.on('exit', function (code) {
		console.log('child process exited with code ' + code);
	});
	
	console.log(ffmpeg_cmd);
	terminal.stdin.write(ffmpeg_cmd);
    terminal.stdin.end();
});

// Start a simple server
var soundBuffer=[];
var decoder = new lame.Decoder();
var buff_size = 0;
var speaker;
var thisBuffer;
var soundRequest;
var sampleSeconds = 3;

var soundServer = http.createServer(function (req, res) {
	soundRequest = req;
	req.on('data',function(data){
		soundBuffer.push(data);
		//console.log(getSecondsFromBuffer(soundBuffer)+' seconds');
		/*buff_size += data.length;
		
		if(buff_size >= (1024*1024)){
			// Read out from the buffer..
			// TODO: This is not an efficient way, There is a better way to concatenate buffers

			thisBuffer = soundBuffer;
			var playback_seconds = (buff_size*8)/196608;
			console.log(playback_seconds+" seconds of playback");

			// Reset the buffer
			soundBuffer=[];
			buff_size=0;

			for(i in thisBuffer){
				decoder.write(thisBuffer[i]);
			}
		} else {
			//console.log('soundBuffer : '+soundBuffer.length);
		}*/
	});
}).listen(8001);

soundServer.on('connection', function(){
	playFromBuffer();
});

decoder.on('format', function(format){
	speaker = new Speaker(format);
	this.pipe(speaker);
});

playFromBuffer = function(){
	var playDuration = getSecondsFromBuffer(soundBuffer)*1000;
	if(playDuration == 0){
		// Stop the sound at this point
		if(typeof(speaker) != "undefined"){
			
		}		

		// Requires buffering maybe?
		console.log('Determining speed for a sample of '+sampleSeconds+' seconds..');
		computeStreamSpeed(sampleSeconds, function(speed){
			console.log('speed : '+parseInt(speed)+' Kbps');
			if(speed > 192){
				// No buffering required
				playFromBuffer();
			} else {
				// Buffering required.. 
				// increase sampleSeconds by some factor.
				sampleSeconds = Math.ceil(sampleSeconds*(192/speed));
				playFromBuffer();
			}	
		});

		return;
	}

	console.log('writing to soundBuffer : '+getSecondsFromBuffer(soundBuffer)+' Seconds.');	
	for(i in soundBuffer){
		decoder.write(soundBuffer[i]);
	}
	console.log('write finished!');
	soundBuffer=[];

	setTimeout(function(){
		playFromBuffer();
	},playDuration);
}


computeStreamSpeed = function(sampleSize, success_callback, fail_callback){
	//get the current buffer size 
	startSize = getBufferArraySize(soundBuffer);
	
	// Buffer for sampleSize seconds

	setTimeout(function(){
		endSize = getBufferArraySize(soundBuffer);
		dataSize = endSize-startSize;
		if(dataSize < 0){
			fail_callback();
			return;
		}

		// Calculate the speed
		var kbps = (dataSize*8)/(sampleSize*1024);
		success_callback(kbps);
	},sampleSize*1000);
}

getBufferArraySize = function(buffArray){
	var size=0;
	for(i in buffArray){
		size+=buffArray[i].length;
	}

	return(size);
}

getSecondsFromBuffer = function(buffArray){
	var size = getBufferArraySize(buffArray);
	return((size*8)/196608);
}