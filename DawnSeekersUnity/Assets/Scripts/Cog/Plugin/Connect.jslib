mergeInto(LibraryManager.library, {

	UnityReadyRPC: function () {
		window.dispatchReactUnityEvent(
			"unityReady"
		);
	},

	SendMessageRPC: function (msgJson) {
		window.dispatchReactUnityEvent(
			"sendMessage",
			UTF8ToString(msgJson)
		);
	},

});