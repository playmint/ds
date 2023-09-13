mergeInto(LibraryManager.library, {

	UnityReadyRPC: function () {
		window.dispatchReactUnityEvent(
			"unityReady"
		);
	},

	SendEventRPC: function (msgJson) {
		window.dispatchReactUnityEvent(
			"sendMessage",
			UTF8ToString(msgJson)
		);
	},

});