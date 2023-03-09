mergeInto(LibraryManager.library, {
	TestCallRPC: function () {
        window.dispatchReactUnityEvent(
            "testCall"
        );
    },

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