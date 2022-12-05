mergeInto(LibraryManager.library, {
    ConnectWC:  async function (gameObjectName, callback, fallback) {
        const parsedObjectName = UTF8ToString(gameObjectName);
        const parsedCallback = UTF8ToString(callback);
        const parsedFallback = UTF8ToString(fallback);
        
        try {
            console.log(window.unityWalletConnect);
            await window.unityWalletConnect.connect(); 
            console.log(nethereumUnityInstance);   
            console.log(parsedObjectName)  ;   
            console.log(parsedCallback)  ;     
            nethereumUnityInstance.SendMessage(parsedObjectName, parsedCallback, "ok");
            
        } catch (error) {
            nethereumUnityInstance.SendMessage(parsedObjectName, parsedFallback, error.message);           
        }
    },
    IsWalletConnectAvailable: function () {
        if (window.unityWalletConnect) return true;
        return false;
    },
    WCGetSelectedAddress: function () {
        var returnValue = window.unityWalletConnect.getAccount();
        if(returnValue !== null) {
            var bufferSize = lengthBytesUTF8(returnValue) + 1;
            var buffer = _malloc(bufferSize);
            stringToUTF8(returnValue, buffer, bufferSize);
            return buffer;
        }
    },
    SignWC:  async function (message, gameObjectName, callback, fallback) {
        const parsedMessage = UTF8ToString(message);
        const parsedObjectName = UTF8ToString(gameObjectName);
        const parsedCallback = UTF8ToString(callback);
        const parsedFallback = UTF8ToString(fallback);
        
        try {      
            const sig = await window.unityWalletConnect.sign(parsedMessage);  
            nethereumUnityInstance.SendMessage(parsedObjectName, parsedCallback, sig);            
        } catch (error) {
            nethereumUnityInstance.SendMessage(parsedObjectName, parsedFallback, error.message);           
        }
    }

});
