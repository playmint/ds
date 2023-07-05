var LibraryWebSocket = {
	$webSocketState: {
		instances: {},
		lastId: 0, // Unique ID per Session
		onOpen: null,
		onClose: null,
		onMesssage: null,
		onError: null,
		debug: false // Debug Log Messages
	},

	WebSocketSetOnOpen: function(callback) {
		webSocketState.onOpen = callback;
	},

	WebSocketSetOnMessage: function(callback) {
		webSocketState.onMessage = callback;
	},

	WebSocketSetOnError: function(callback) {
		webSocketState.onError = callback;
	},

	WebSocketSetOnClose: function(callback) {
		webSocketState.onClose = callback;
	},

	WebSocketCreate: function(url, subprotocol) {
		var urlStr = UTF8ToString(url);
		var subprotocolStr = UTF8ToString(subprotocol);
		var id = ++webSocketState.lastId;
		webSocketState.instances[id] = {
			url: urlStr,
			subprotocol: subprotocolStr,
			ws: null
		};
		return id;
	},	

	WebSocketRelease: function(instanceId) {
		var instance = webSocketState.instances[instanceId];
		if (!instance) return 0;
		if (instance.ws !== null && (instance.ws.readyState === 0 || instance.ws.readyState === 1))
			instance.ws.close();
		delete webSocketState.instances[instanceId];
		return 0;
	},

	WebSocketConnect: function(instanceId) {
		var instance = webSocketState.instances[instanceId];
		if (!instance) return -1;
		if (instance.ws !== null) return -2;

		if (webSocketState.debug)
			console.log("[WebsocketJS] Connect to "+instance.url+ " "+instance.subprotocol);

		instance.ws = new WebSocket(instance.url, [instance.subprotocol]);
		instance.ws.binaryType = 'arraybuffer';

		instance.ws.onopen = function() {
			if (webSocketState.debug)
				console.log("[WebsocketJS] OnOpen");

			if (webSocketState.onOpen === null) return;

			Module['dynCall_vi'](webSocketState.onOpen, instanceId);
		};

		instance.ws.onmessage = function(ev) {
			if (webSocketState.debug)
				console.log("[WebsocketJS] OnMessage:", typeof(ev.data), ev.data);

			if (webSocketState.onMessage === null) return;

			var msgBytes = lengthBytesUTF8(ev.data);
			var msgBuffer = _malloc(msgBytes + 1);
			stringToUTF8(ev.data, msgBuffer, msgBytes + 1);

			try {
				Module['dynCall_vii'](webSocketState.onMessage, instanceId, msgBuffer);
			} finally {
				_free(msgBuffer);
			}
		};

		instance.ws.onerror = function(ev) {			
			if (webSocketState.debug)
				console.log("[WebsocketJS] OnError: ", ev);

			if (webSocketState.onError === null) return;

			var msg = "Websocket error occured!";

			var msgBytes = lengthBytesUTF8(msg);
			var msgBuffer = _malloc(msgBytes + 1);
			stringToUTF8(msg, msgBuffer, msgBytes + 1);

			try {
				Module['dynCall_vii'](webSocketState.onError, instanceId, msgBuffer);
			} finally {
				_free(msgBuffer);
			}
		};

		instance.ws.onclose = function(ev) {
			if (webSocketState.debug)
				console.log("[WebsocketJS] OnClose");

			if (webSocketState.onClose)
				Module['dynCall_vii'](webSocketState.onClose, instanceId, ev.code);
			delete instance.ws;
		};

		return 0;
	},

	WebSocketClose: function(instanceId, code, reasonPtr) {
		if (webSocketState.debug)
			console.log("[WebsocketJS] Close connection");

		var instance = webSocketState.instances[instanceId];
		if (!instance) return -1;
		if (instance.ws === null) return -2;
		if (instance.ws.readyState !== 1) return -3; 

		var reason = ( reasonPtr ? UTF8ToString(reasonPtr) : undefined );
		
		try {
			instance.ws.close(code, reason);
			return 0;			
		} catch(err) {
			return -4;
		}
	},

	WebSocketSend: function(instanceId, bufferPtr, length) {
		if (webSocketState.debug)
			console.log("[WebsocketJS] Send data to "+instanceId+" with length "+length);

		var instance = webSocketState.instances[instanceId];
		if (!instance) return -1;		
		if (instance.ws === null) return -2;
		if (instance.ws.readyState !== 1) return -3;

		try {
			instance.ws.send(HEAPU8.buffer.slice(bufferPtr, bufferPtr + length));
			return 0;			
		} catch (err) {
			return -4;
		}		
	},

	WebSocketSendString: function(instanceId, strPtr) {
		if (webSocketState.debug)
			console.log("[WebsocketJS] Send data to "+instanceId+" with length "+length);

		var instance = webSocketState.instances[instanceId];
		if (!instance) return -1;		
		if (instance.ws === null) return -2;
		if (instance.ws.readyState !== 1) return -3;

		try {
			var str = UTF8ToString(strPtr);
			instance.ws.send(str);
			return 0;			
		} catch (err) {
			return -4;
		}		
	},	

	WebSocketGetState: function(instanceId) {
		var instance = webSocketState.instances[instanceId];
		if (!instance) return -1;
		if (instance.ws === null) return -2;
 		return instance.ws.readyState;
	}

};

autoAddDeps(LibraryWebSocket, '$webSocketState');
mergeInto(LibraryManager.library, LibraryWebSocket);