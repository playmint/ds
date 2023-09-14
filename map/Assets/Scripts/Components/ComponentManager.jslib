mergeInto(LibraryManager.library, {

	UnityReadyRPC: function () {
		window.dispatchReactUnityEvent(
			"unityReady"
		);
	},

	SendEventRPC: function (eventName) {
        console.log('SendEventRPC', eventName);
		window.dispatchReactUnityEvent(
			UTF8ToString(eventName)
		);
	},

});
