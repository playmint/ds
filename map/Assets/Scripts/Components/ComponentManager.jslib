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

	SendPositionRPC: function (eventName, x, y, z, isVisible) {
		window.dispatchReactUnityEvent(
			UTF8ToString(eventName),
			x,
			y,
			z,
			isVisible
		);
	},

});
