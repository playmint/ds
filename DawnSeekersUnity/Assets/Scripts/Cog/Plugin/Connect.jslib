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
	TileInteractionRPC: function (q, r, s) {
		window.dispatchReactUnityEvent(
			"tileInteraction",
			q,
			r,
			s
		);
	},
	DispatchActionEncodedRPC: function (action) {
		window.dispatchReactUnityEvent(
			"dispatchActionEncoded",
			UTF8ToString(action)
		);
	}

});
