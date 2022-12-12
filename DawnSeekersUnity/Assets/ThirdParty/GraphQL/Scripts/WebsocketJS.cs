using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using AOT;
using UnityEngine;

namespace GraphQL4Unity
{
    public class WebsocketJS : IWebSocket
    {
        public bool Connected { get; private set; }

        public event Action CloseEvent;
        public event Action OpenEvent;

        public event WebSocketMessage MessageEvent;

        private int _instanceId;

        public void Init(string url, List<Header> headers, string subprotocol)
        {
            _instanceId = WebsocketJsNative.CreateInstance(url, subprotocol, this);
        }

        ~WebsocketJS()
        {
            WebsocketJsNative.DestroyInstance(_instanceId);
        }

        public void Open()
        {
            WebsocketJsNative.WebSocketConnect(_instanceId);
        }

        public void Close()
        {
            WebsocketJsNative.WebSocketClose(_instanceId, 0, null);
        }

        public Task<bool> WriteAsync(string message)
        {
            var ret = new TaskCompletionSource<bool>();
            try
            {
                //byte[] bytes = Encoding.UTF8.GetBytes(message);
                //int result = WebsocketJsNative.WebSocketSend(_instanceId, bytes, bytes.Length);
                int result = WebsocketJsNative.WebSocketSendString(_instanceId, message);
                ret.SetResult(result == 0 ? true : false);
            }
            catch (Exception e)
            {
                Debug.LogException(e);
                ret.SetResult(false);
            }
            return ret.Task;
        }

        public void OnJsOpenEvent()
        {
            Connected = true;
            this.OpenEvent?.Invoke();
        }

        public void OnJsCloseEvent(int closeCode)
        {
            Connected = false;
            this.CloseEvent?.Invoke();
        }

        public void OnJsMessageEvent(string message)
        {
            this.MessageEvent?.Invoke(message);
        }

        public void OnJsErrorEvent(string message)
        {
            Debug.LogError(message);
        }
    }

    public static class WebsocketJsNative
    {
        /* If callbacks are initialized and set */
        private static bool isInitialized = false;

        private static readonly Dictionary<Int32, WebsocketJS> _instances =
            new Dictionary<Int32, WebsocketJS>();

        private static void Initialize()
        {
            WebSocketSetOnOpen(DelegateOnOpenEvent);
            WebSocketSetOnMessage(DelegateOnMessageEvent);
            WebSocketSetOnError(DelegateOnErrorEvent);
            WebSocketSetOnClose(DelegateOnCloseEvent);
            isInitialized = true;
        }

        public static int CreateInstance(string url, string subprotocol, WebsocketJS ws)
        {
            if (!isInitialized)
                Initialize();

            int instanceId = WebSocketCreate(url, subprotocol);
            _instances.Add(instanceId, ws);
            return instanceId;
        }

        public static void DestroyInstance(int instanceId)
        {
            _instances.Remove(instanceId);
            WebSocketRelease(instanceId);
        }

        /* Delegates */
        public delegate void OnOpenCallback(int instanceId);
        public delegate void OnMessageCallback(int instanceId, IntPtr msgPtr);
        public delegate void OnErrorCallback(int instanceId, IntPtr errorPtr);
        public delegate void OnCloseCallback(int instanceId, int closeCode);

        /* JavaScript Functions */
        [DllImport("__Internal")]
        public static extern int WebSocketCreate(string url, string subprotocol);

        [DllImport("__Internal")]
        public static extern void WebSocketRelease(int instanceId);

        [DllImport("__Internal")]
        public static extern int WebSocketConnect(int instanceId);

        [DllImport("__Internal")]
        public static extern int WebSocketClose(int instanceId, int code, string reason);

        [DllImport("__Internal")]
        public static extern int WebSocketSend(int instanceId, byte[] dataPtr, int dataLength);

        [DllImport("__Internal")]
        public static extern int WebSocketSendString(int instanceId, string data);

        [DllImport("__Internal")]
        public static extern int WebSocketGetState(int instanceId);

        // Callback Functions

        [MonoPInvokeCallback(typeof(OnOpenCallback))]
        public static void DelegateOnOpenEvent(int instanceId)
        {
            if (_instances.TryGetValue(instanceId, out WebsocketJS instanceRef))
            {
                instanceRef.OnJsOpenEvent();
            }
        }

        [MonoPInvokeCallback(typeof(OnMessageCallback))]
        public static void DelegateOnMessageEvent(int instanceId, IntPtr msgPtr)
        {
            if (_instances.TryGetValue(instanceId, out WebsocketJS instanceRef))
            {
                string msg = Marshal.PtrToStringAuto(msgPtr);
                instanceRef.OnJsMessageEvent(msg);
            }
        }

        [MonoPInvokeCallback(typeof(OnErrorCallback))]
        public static void DelegateOnErrorEvent(int instanceId, IntPtr errorPtr)
        {
            if (_instances.TryGetValue(instanceId, out WebsocketJS instanceRef))
            {
                string errorMsg = Marshal.PtrToStringAuto(errorPtr);
                instanceRef.OnJsErrorEvent(errorMsg);
            }
        }

        [MonoPInvokeCallback(typeof(OnCloseCallback))]
        public static void DelegateOnCloseEvent(int instanceId, int closeCode)
        {
            if (_instances.TryGetValue(instanceId, out WebsocketJS instanceRef))
            {
                instanceRef.OnJsCloseEvent(closeCode);
            }
        }

        // Setter for Callback Functions

        [DllImport("__Internal")]
        public static extern void WebSocketSetOnOpen(OnOpenCallback callback);

        [DllImport("__Internal")]
        public static extern void WebSocketSetOnMessage(OnMessageCallback callback);

        [DllImport("__Internal")]
        public static extern void WebSocketSetOnError(OnErrorCallback callback);

        [DllImport("__Internal")]
        public static extern void WebSocketSetOnClose(OnCloseCallback callback);
    }
}
