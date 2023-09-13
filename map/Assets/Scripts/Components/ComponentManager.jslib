mergeInto(LibraryManager.library, {

	UnityReadyRPC: function () {
        console.log('UnityReadyRPC');
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