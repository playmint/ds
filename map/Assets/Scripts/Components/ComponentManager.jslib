mergeInto(LibraryManager.library, {

	UnityReadyRPC: function () {
		window.dispatchReactUnityEvent(
			"unityReady"
		);
	},

	SendEventRPC: function (eventName) {
		window.dispatchReactUnityEvent(
			UTF8ToString(eventName)
		);
	},

});
