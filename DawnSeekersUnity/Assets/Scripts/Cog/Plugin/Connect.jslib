mergeInto(LibraryManager.library, {
	TestCallRPC: function () {
        window.dispatchReactUnityEvent(
            "testCall"
        );
    },
	SceneLoadedRPC: function (sceneName) {
		window.dispatchReactUnityEvent(
			"sceneLoaded",
			UTF8ToString(sceneName)
		);
	},
	UnityReadyRPC: function () {
		window.dispatchReactUnityEvent(
			"unityReady"
		);
	},
	DispatchActionEncodedRPC: function (action) {
		window.dispatchReactUnityEvent(
			"dispatchActionEncoded",
			UTF8ToString(action)
		);
	}

});
