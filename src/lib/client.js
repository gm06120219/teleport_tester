var WebSocket = require('ws');
var fs = require('fs');
var crypto = require('crypto');
var uuid = require('uuid');
var path = require('path');
var dgram = require('dgram');

var Emitter = require('./emitter');
var Pack = require('./pack');
var Response = require('./response');

// process.on('uncaughtException', function(err) {
// 	console.log('Caught exception: ' + err);
// });

function Client(i, pwd, host) {
	Emitter.call(this);
	this.host = "wss://conn.vlinsys.net:80";
	i = i || {};
	pwd = pwd || '123456';
	this.identity = i;
	this.pwd = pwd;
	this.connected = false;
	this.ready = false;
	this.shouldReconnect = true;
	this.reconnectTimeout = 0;
	this.timeout = 150 * 1000; // liguangming modify 20 seconds -> 150 seconds for test
	this.waiters = {};
	this.listeners = {};
	this.fileReceivers = {};
	this.binaryMetadata = null;
	this.defaultConnTimeoutId = 0;
	this.lastPingTime = 0;
	this.heartbeatTime = 60 * 1000;
	this.queue = [];

	// cmd event came from listen action
	this.cmds = [
		'request',
		'response',
		'start_binary',
		'end_binary',
		'event',
		'push',
		'binary'
	];
	this.ws = null;

	if (host == null) {
		this.listenUriBroadcast();
		this.defaultConnTimeoutId = setTimeout(this.delegate("connectToIDC"), 5000);
	} else {
		this.connectToIDC(host);
	}
	var self = this;
	setInterval(function() {
		if (self.lastPingTime !== 0 && new Date().getTime() - self.lastPingTime >= 2 * self.heartbeatTime) {
			self._reconnect();
		}
	}, self.heartbeatTime);
}

Client.prototype = new Emitter();

Client.prototype.connectToIDC = function(host) {
	// if (this.host === host) {
	//   return;
	// }
	if (host) {
		this.host = host;
	}
	if (this.connected) {
		this._reconnect();
	} else {
		this._connect();
	}
};

Client.prototype.listenUriBroadcast = function() {
	var socket = dgram.createSocket('udp4');
	socket.bind(60007, function() {
		socket.addMembership("224.1.2.3");
	});
	socket.on('message', this.delegate("onMulticastMessage"));
};

Client.prototype.onMulticastMessage = function(s, rinfo) {
	try {
		s = s.toString();
		s = JSON.parse(s);
	} catch (e) {
		return;
	}
	if (s.type !== "teleport_server") {
		return;
	}

	var host = 'wss://' + s.ip + ':' + s.port;
	if (host === this.host) {
		return;
	}
	this.host = host;
	clearTimeout(this.defaultConnTimeoutId);
	if (this.connected) {
		this._reconnect();
	} else {
		this._connect();
	}
};

/*******************************************************
 * outgoing commands:
 * 'request', 'response', 'publish', 'subscribe',
 * 'unsubscribe', 'find', 'login', 'start_binary',
 * 'end_binary'
 * of which:
 * login, binary, start_binary,
 * end_binary are internal commands
 ******************************************************/
Client.prototype.request = function(msg, fn) {
	if (!msg.to) {
		this.logError('to missing');
		return;
	}
	fn = fn || this.delegate('_defaultCallback');
	var pack = new Pack('request', msg);
	this._addRequest(pack.id, pack, fn, msg.queue);
	this._send(pack);
};

Client.prototype.response = function(id, to, msg) {
	msg.to = to;
	var p = new Pack('response', msg, id);
	// console.log('gm response pack is:' + JSON.stringify(p)) ; // liguangming add for debug
	this._send(p);
};

Client.prototype.publish = function(msg) {
	var pack = new Pack('publish', msg);
	this._addRequest(pack.id, pack, this.delegate('_defaultCallback'));
	this._send(pack);
};

Client.prototype.subscribe = function(pattern, listener) {
	var pack = new Pack('subscribe', {
		pattern: pattern
	});
	this.listeners[pack.id] = {
		req: pack,
		fn: listener
	};
	this._addRequest(pack.id, pack, this.delegate('_defaultCallback'));
	this._send(pack);
};

Client.prototype.unsubscribe = function(pattern) {
	var pack = new Pack('unsubscribe', {
		pattern: pattern
	});
	this._addRequest(pack.id, pack, this.delegate('_defaultCallback'));
	if (this.listeners[pack.id]) {
		this.listeners[pack.id].req = null;
		this.listeners[pack.id].fn = null;
	}
	this.listeners[pack.id] = null;
	this._send(pack);
};

Client.prototype.find = function(key, fn) {
	var pack = new Pack('find', {
		key: key
	});
	this._addRequest(pack.id, pack, fn);
	this._send(pack);
};

Client.prototype.push = function(msg) {
	var pack = new Pack('push', msg);
	this._send(pack);
};

Client.prototype.getMd5Sum = function(file) {
	var md5sum = crypto.createHash('md5');
	md5sum.update(fs.readFileSync(file));
	return md5sum.digest('hex');
};

Client.prototype.sendByteArray = function(buffer, to, description) {
	// TODO
	var pack = new Pack('binary', {
		to: to,
		description: description
	});

	if (!self.ws) {
		console.log('ws is null. ');
		return;
	}
	this.ws.send(pack.toJSON());
	this.ws.send(buffer, {
		binary: true
	});
};

Client.prototype.sendFile = function(file, to, description, fn) {
	if (!fs.existsSync(file)) {
		this.logWarn('file: ' + file + 'do not exists!');
		return;
	}
	var pack = new Pack('start_binary', {
		to: to,
		filename: path.basename(file),
		size: fs.statSync(file).size,
		md5: this.getMd5Sum(file),
		description: description
	});
	var bin = new Pack("binary", {
		to: to
	}, pack.id);
	var self = this;
	self._addRequest(pack.id, pack, function(req, res) {
		if (!res.err) {
			// liguangming add 4k limit for test send file
			var s = fs.createReadStream(file, {
				highWaterMark: 4 * 1024
			});


			s.on('data', function(d) {
				if (!self.ws || self.ws.readyState != 1) {
					console.log('ws is null. ');
					return;
				}
				self.ws.send(bin.toJSON());
				// console.log(d.length); // liguangming add for debug
				self.ws.send(d, {
					binary: true
				});
			});
			s.on('end', function() {
				var end_pack = new Pack('end_binary', {
					id: pack.id,
					to: to
				});
				self._addRequest(end_pack.id, end_pack, function(req, res) {
					fn(res);
				});
				self._send(end_pack);
			});
		} else {
			console.log('send request start_binary error.' + res.err);
			fn(res);
		}
	});
	this._send(pack);
};

Client.prototype.connect = function() {
	this.shouldReconnect = true;
	this._cleanUp();
	this._connect();
};

Client.prototype._send = function(pack) {
	this.queue.push(pack);
	this._proceedQueue();
};

Client.prototype._proceedQueue = function() {
	if (!this.connected || !this.ready) {
		return;
	}
	if (this.queue.length === 0) {
		return;
	}
	var self = this;
	var pack = this.queue.shift();
	try {
		this.ws.send(pack.toJSON(), function(error) {
			if (error) {
				self.logError(error);
				self.queue.unshift(pack);
				if (self.ws) {
					self.ws.close();
				}
			}
		});
	} catch (e) {
		console.log(e);
	}
};

Client.prototype._cleanUp = function() {
	if (this.ws) {
		this.ws.removeAllListeners();
		if (this.ws) {
			this.ws.close();
		}
		this.ws = null;
	}
	this.removeAllListeners(); // add by liguangming
};

Client.prototype._connect = function() {
	this.logDebug("connecting: " + this.host);
	var ws = new WebSocket(this.host, {
		'rejectUnauthorized': false
	});
	ws.on('open', this.delegate('_onOpen'));
	ws.on('close', this.delegate('_onClose'));
	ws.on('message', this.delegate('_onMessage'));
	ws.on('error', this.delegate('_onError'));
	var self = this;
	ws.on('ping', function() {
		self.lastPingTime = new Date().getTime();
	});
	this.ws = ws;
};

Client.prototype._onOpen = function() {
	this.connected = true;
	// this.logDebug('connected'); // comment by liguangming for debug
	this.reconnectTimeout = 0;
	this._login();
};

Client.prototype._onClose = function() {
	this.connected = false;
	this.ready = false;
	this.logDebug('disconnected');
	if (this.shouldReconnect) {
		this._reconnect();
	}
};

Client.prototype._onMessage = function(msg, flags) {
	// liguangming add for debug
	if (msg.cmd != 'push') {
		this.logDebug('gm _onMessage ' + JSON.stringify(msg));
	}
	// liguangming add for debug

	if (flags.binary) {
		this._onBinMessage(msg);
	} else {
		this._onTextMessage(msg);
	}
};

Client.prototype._onError = function(error) {
	this.logWarn(error);
	if (!this.connected && this.shouldReconnect) {
		this._reconnect();
	}
};

Client.prototype._reconnect = function() {
	this.lastPingTime = 0;
	if (this.reconnectTimeout < 60 * 1000) {
		this.reconnectTimeout += 1000;
	}
	this.logError('try to reconnect in ' + this.reconnectTimeout + ' ms');
	setTimeout(this.delegate('_connect'), this.reconnectTimeout);
};

Client.prototype._onBinMessage = function(data) {
	if (!this.binaryMetadata) {
		return;
	}

	var id = this.binaryMetadata.id;
	if (this.fileReceivers[id]) {
		this.fileReceivers[id].file.write(data);
	} else {
		this.emit('byte_array', this.binaryMetadata, data);
	}

	this.binaryMetadata = null;
};

Client.prototype._onTextMessage = function(data) {
	var pack = this._validate(data);
	if (!pack) {
		this.logWarn('invalid package: ' + data);
		return;
	}
	this[this._convertCmdStyle(pack.cmd)](pack);
};

Client.prototype._convertCmdStyle = function(cmd) {
	var keys = cmd.split('_');
	var key = '';
	for (var i = 0, len = keys.length; i < len; i++) {
		key += keys[i][0].toUpperCase() + keys[i].slice(1);
	}
	return '_on' + key;
};

/*******************************************************
 * incoming commands defined in protocol
 * 'request', 'response', 'start_binary',
 * 'end_binary', 'event', 'pull', 'rename'
 *******************************************************/

/*
	pack: {
		cmd: 'request',
		msg: {
			from: {
				user: '',
				type: '',
				id: ''
			},
			to: {
				user: '',
				type: '',
				id: ''
			}
		},
		id: ''
	}
*/
Client.prototype._onRequest = function(pack) {
	var res = new Response(this, pack.id, pack.msg.from);
	this.emit('request', pack.msg, res);
};

Client.prototype._onResponse = function(pack) {
	// console.log('_onResponse ' + JSON.stringify(pack)); // liguangming add for debug
	var id = pack.id;
	if (!this.waiters[id]) {
		this.logWarn('response with id: ' + pack.id + ' not found!');
		return;
	}
	var waiter = this.waiters[id];
	if (waiter.timeout) {
		clearTimeout(waiter.timeout);
	}
	waiter.fn(waiter.req.msg, pack.msg);
	this._clearRequestWaiter(id);
	this.emit('response', pack.msg); // liguangming add for process response package
};

Client.prototype._onPush = function(pack) {
	this.emit('push', pack.msg);
};

Client.prototype._onBinary = function(pack) {
	this.binaryMetadata = pack;
};

Client.prototype._onStartBinary = function(pack) {
	var filepath = '../receiver/' + uuid.v4();
	this.logDebug('gm _onStartBinary filepath:' + filepath); // liguangming debug

	var binary = {
		from: pack.msg.from,
		filepath: filepath,
		file: fs.createWriteStream(filepath),
		md5: pack.msg.md5,
		filename: pack.msg.filename,
		size: pack.msg.size,
		description: pack.msg.description || ''
	};
	this.fileReceivers[pack.id] = binary;
	this.response(pack.id, pack.msg.from, {
		msg: 'ok',
		approve_binary: true
	});
};

Client.prototype._onEndBinary = function(pack) {
	this.logDebug('gm _onEndBinary');
	var id = pack.msg.id;
	if (!this.fileReceivers[id]) {
		return;
	}
	var fileReceiver = this.fileReceivers[id];
	fileReceiver.file.end();
	this.fileReceivers[id] = null;
	var self = this;
	fileReceiver.file.on('close', function() {
		delete fileReceiver.file;
		var rmd5 = self.getMd5Sum(fileReceiver.filepath);
		var rsize = fs.statSync(fileReceiver.filepath).size;

		if (rmd5 !== fileReceiver.md5) {
			self.emit('file_error', fileReceiver, "md5 checksum failed", rmd5);
			self.response(pack.id, pack.msg.from, {
				id: id,
				msg: 'md5 checksum failed'
			});
		} else if (rsize !== fileReceiver.size) {
			self.emit('file_error', fileReceiver, "wrong file size", rsize);
			self.response(pack.id, pack.msg.from, {
				id: id,
				msg: 'wrong file size'
			});
		} else {
			var done = function(resp) {
				if (resp) {
					self.response(pack.id, pack.msg.from, {
						id: id,
						msg: 'ok',
						resp: resp
					});
				} else {
					self.response(pack.id, pack.msg.from, {
						id: id,
						msg: 'ok'
					});
				}
			};
			self.emit('file', fileReceiver, done);
		}
	});
};

Client.prototype._onEvent = function(pack) {
	var id = pack.id;
	if (!this.listeners[id]) {
		this.logWarn('event listener with id: ' + pack.id + 'not found!');
		return;
	}
	var listener = this.listeners[id];
	listener.fn(pack.msg);
};

Client.prototype._validate = function(data) {
	var d;
	try {
		d = JSON.parse(data);
	} catch (e) {
		return false;
	}
	if (!d.cmd || !d.msg || !d.id) {
		return false;
	}
	if (this.cmds.indexOf(d.cmd) === -1) {
		return false;
	}
	return new Pack(d.cmd, d.msg, d.id);
};

Client.prototype._clearRequestWaiter = function(id) {
	if (!this.waiters[id]) {
		return;
	}
	this.waiters[id].req = null;
	this.waiters[id].fn = null;
	this.waiters[id].timeout = null
	this.waiters[id] = null;
	this._proceedQueue();
};

Client.prototype._addRequest = function(id, req, fn, no_timeout) {
	var self = this;
	this.waiters[id] = {
		req: req,
		fn: fn
	};
	if (!no_timeout) {
		// self.logDebug('gm _addRequest ' + JSON.stringify(req)); // liguangming add for debug
		var timeout = this.timeout;
		if (req.msg.timeout && typeof req.msg.timeout == 'number') {
			timeout = req.msg.timeout;
		}
		this.waiters[id].timeout = setTimeout(function() {
			fn(req.msg, {
				err: 'request ' + id + ' timeout'
			});
			self._clearRequestWaiter(id);
		}, timeout);
	}
};

Client.prototype._login = function() {
	var self = this;
	var pack = new Pack('login', {
		identity: this.identity,
		pwd: this.pwd
	});
	// self.logWarn(JSON.stringify(pack)); // add by liguangming to debug
	this._addRequest(pack.id, pack, function(req, res) {
		if (res.err) {
			self.logError(res.err);
			self.shouldReconnect = false;
			self.emit('login_fail');
		} else {
			self.emit('login_success');
			self.ready = true;
			self.logDebug('login ok');
			self.logDebug(JSON.stringify(res));
			self._proceedQueue();
		}
	});
	try {
		self.ws.send(pack.toJSON());
	} catch (e) {
		console.log('ws send data failed.');
		self.emit('login_fail');
	}
};

Client.prototype._defaultCallback = function(req, res) {
	if (res.err) {
		this.logError(res.err);
	} else {

	}
};

Client.prototype.close = function() {
	this._cleanUp();
};

module.exports = Client;