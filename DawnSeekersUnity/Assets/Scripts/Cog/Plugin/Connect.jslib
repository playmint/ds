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
	}
});
