socketio = require('socket.io');
var dgram = require('dgram');

var commands = {
	FORWARD: 0,
	BACKWARD: 1,
	LEFT: 2,
	RIGHT: 3,
	UP: 4,
	DOWN: 5,
	ROTLEFT: 6,
	ROTRIGHT: 7,
	TAKEOFF: 8,
	LAND: 9,
	STOP: 10,
	FLIPAHEAD: 11,
	FLIPLEFT: 12,
	FLIPBEHIND: 13,
	FLIPRIGHT: 14,
	DISABLEEMERGENCY: 15,
	SWITCHCAMERA: 16
};

module.exports.listen = function(port){ // client	){
	io = socketio.listen(port);

	//var pngStream = client.getPngStream();
	io.set('log level', 1);   // reduce loggings to warning only
	
	var sClients = new Array();
	var iActiveConnections = 0;
	var iSpeed = .65;
	var sController = null;
	var isFlying = false;
	var iChannel = 0;
	var iAltitude = 0;		


/*
	client.disableEmergency();
	client.ftrim();

	//Enables navdata
	// emits events: landed, hovering, flying, landing, batteryChange, altitudeChange
	client.config('general:navdata_demo', 'FALSE');
	client.config('video:video_channel', iChannel);

	client.on('landed', function() {
		console.log("Landed");
	});

	client.on('landing', function() {
		console.log("Landing");
	});

	client.on('hovering', function() {
		console.log("Hovering");
	});

	client.on('flying', function() {
		console.log("Flying");
	});

	//Experimental
	client.on('navdata', function(data) {
	//	console.log('NavData', data);
	});
*/
	io.sockets.on('connection', function(socket) {
		sClients[iActiveConnections++] = socket.id;

		var udpclient = dgram.createSocket('udp4', function(msg, rinfo) {
			//Receive navdata and messages from server here
			socket.emit('battery-change', msg.readUInt8(0));
			var newAlt = msg.readUInt32LE(1);
			newAlt = newAlt / 1000;
			socket.emit('altitude-change', newAlt);
			iAltitude = newAlt;
			console.log("data received: " + msg.toString() + "\n");
		});

		udpclient.bind(4711);

		if( sController === null ) {
			sController = socket.id;
		} else {
			socket.emit('disable-controls', { disable: true });
		}

		console.log("\nConnected to      \t" + socket.handshake.address.address + ":" + socket.handshake.address.port );
		console.log("Active Connections: " + iActiveConnections); // Example of how to keep track of active connections to site.
/*
		client.on('batteryChange', function(data) {
			socket.emit('battery-change', data);
		});
		client.on('altitudeChange', function(data) {
			socket.emit('altitude-change', data);
			iAltitude = data;
		});
*/
		socket.emit('state-change', { flying: isFlying });

		socket.on('command', function(data) {
			var str = String(data);
			var message = new Buffer(str);

			if( parseInt(str) == commands.TAKEOFF ) {
				isFlying = true;
				io.sockets.emit('state-change', { flying: isFlying });
			} else if( parseInt(str) == commands.LAND ) {
				isFlying = false;
				io.sockets.emit('state-change', { flying: isFlying });
			} else if( parseInt(str) == commands.SWITCHCAMERA ) {
					iChannel = (iChannel == 0) ? 1: 0;
					console.log("switching to %d", iChannel);
					//client.config('video:video_channel', iChannel);
			}
	
/*			switch(parseInt(str)) {
				case commands.TAKEOFF:
					client.takeoff( function() {
						isFlying = true;
						io.sockets.emit('state-change', { flying: isFlying });
					});
					break;

				case commands.LAND:
					client.land( function() {
						isFlying = false;
						io.sockets.emit('state-change', { flying: isFlying });
					});
					break;

				case commands.FORWARD:
					client.front(iSpeed);
					break;

				case commands.BACKWARD:
					client.back(iSpeed);
					break;

				case commands.LEFT:
					client.left(iSpeed);
					break;

				case commands.RIGHT:
					client.right(iSpeed);
					break;

				case commands.ROTLEFT:
					client.counterClockwise(iSpeed);
					break;

				case commands.ROTRIGHT:
					client.clockwise(iSpeed);
					break;

				case commands.UP:
					if(iAltitude < 1)
					{
						client.up(iSpeed);
					}
					break;

				case commands.DOWN:
					client.down(iSpeed);
					break;

				case commands.STOP:
					client.stop();
					break;

				case commands.FLIPAHEAD:
					client.animate('flipAhead',100);
					break;

				case commands.FLIPLEFT:
					client.animate('flipLeft',100);
					break;

				case commands.FLIPBEHIND:
					client.animate('flipBehind',100);
					break;

				case commands.FLIPRIGHT:
					client.animate('flipRight',100);
					break;
				
				case commands.DISABLEEMERGENCY:
					client.disableEmergency();
					break;
				
				case commands.SWITCHCAMERA:
					iChannel = (iChannel == 0) ? 1: 0;
					console.log("switching to %d", iChannel);
					client.config('video:video_channel', iChannel);
					break;

				default:
					break;

			}
*/	
			socket.broadcast.emit('command', data);
			udpclient.send(message,0,message.length, 4710,"localhost");
			console.log("Sending message: " + message);
		});

		socket.on('disconnect', function(){
			if( --iActiveConnections > 0 ) {
				if( sController == socket.id ) {
					sClients.shift();
					sController = sClients[0];
					io.sockets.socket(sController).emit('disable-controls', { disable: false });
				} else {
					sClients.splice(sClients.indexOf(socket.id), 1);
				}
			} else {
				sController = null;
			}

			console.log("\nDisconnected from \t" + socket.handshake.address.address + ":" + socket.handshake.address.port );
			console.log("Active Connections: " + iActiveConnections );
		});
	});
}

