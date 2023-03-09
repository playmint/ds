using UnityEngine;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

namespace Cog
{
    struct SelectTileMessage
    {
        public string msg;
        public List<string> tileIDs;
    }

    struct DispatchMessage
    {
        public string msg;
        public string action;
        public object[] args;
    }

    // TODO: The json schema has this structure defined, find a way to export that structure instead of definiing it manually here
    public class State
    {
        [Newtonsoft.Json.JsonProperty(
            "game",
            Required = Newtonsoft.Json.Required.DisallowNull,
            NullValueHandling = Newtonsoft.Json.NullValueHandling.Ignore
        )]
        public GameState Game { get; set; }

        [Newtonsoft.Json.JsonProperty(
            "ui",
            Required = Newtonsoft.Json.Required.DisallowNull,
            NullValueHandling = Newtonsoft.Json.NullValueHandling.Ignore
        )]
        public UIState UI { get; set; }
    }

    public class PluginController : MonoBehaviour
    {
        [DllImport("__Internal")]
        private static extern void SendMessageRPC(string msgJSON);

        [DllImport("__Internal")]
        private static extern void UnityReadyRPC();

        public static PluginController Instance;

        [SerializeField]
        private string _privateKey =
            "0xc14c1284a5ff47ce38e2ad7a50ff89d55ca360b02cdf3756cdb457389b1da223";

        private bool _isRunningStandalone = false;

        public State WorldState { get; private set; }

        private bool _hasStateUpdated;

        // -- EVENTS
        public Action<State> EventStateUpdated;

        // -- //

        protected void Awake()
        {
            Instance = this;
        }

        protected void Start()
        {
            Debug.Log("PluginController::Start()");

#if UNITY_EDITOR
            _isRunningStandalone = true;
            StartNodeProcess();
#elif UNITY_WEBGL
            UnityReadyRPC();
#endif
        }

        protected void Update()
        {
            // state events get dispatched in the update loop so that the event happens in the main thread which is required
            // by anything that renders anything as a side effect of the state update
            if (_hasStateUpdated)
            {
                _hasStateUpdated = false;
                if (EventStateUpdated != null)
                {
                    EventStateUpdated.Invoke(WorldState);
                }
            }
        }

#if UNITY_EDITOR

        // -- Node.js process

        private Thread _nodeJSThread;
        private System.Diagnostics.Process _nodeJSProcess;

        protected void OnDestroy()
        {
            KillNodeProcess();
        }

        private void UpdateState(State state)
        {
            WorldState = state;
            _hasStateUpdated = true;
        }

        private void StartNodeProcess()
        {
            Debug.Log("StartNodeProcess()");
            try
            {
                _nodeJSThread = new Thread(new ThreadStart(NodeProcessThread));
                _nodeJSThread.Start();
            }
            catch (Exception e)
            {
                Debug.Log(e.Message);
            }
        }

        private void KillNodeProcess()
        {
            if (_nodeJSProcess != null)
            {
                _nodeJSProcess.Kill();
            }
        }

        public void NodeProcessThread()
        {
            _nodeJSProcess = new System.Diagnostics.Process
            {
                StartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    WorkingDirectory = "DawnSeekersBridge",
                    FileName = "/Users/hypnoshock/.nvm/versions/node/v16.19.0/bin/node",
                    Arguments = "build/src/index.js " + _privateKey,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardInput = true,
                    CreateNoWindow = true
                }
            };

            _nodeJSProcess.Start();

            while (!_nodeJSProcess.StandardOutput.EndOfStream)
            {
                var line = _nodeJSProcess.StandardOutput.ReadLine();
                
                if (line[0] == '{')
                {
                    try 
                    {
                        var state = JsonConvert.DeserializeObject<State>(line);
                        UpdateState(state);
                    } 
                    catch (Exception e) 
                    {
                        Debug.Log("DSBridge:\n" + line);
                        Debug.LogError(e);
                    }
                }
                else
                {
                    Debug.Log("DSBridge:\n" + line);
                }
            }

            Debug.Log("Node process exiting");

            _nodeJSProcess.WaitForExit();

            Debug.Log("Kill thread");
        }

        // -- End of Node.js process -- //

#endif

        // -- MESSAGE OUT

        public void DispatchAction(string action, params object[] args)
        {
            var dispatchActionMsg = new DispatchMessage
            {
                msg = "dispatch",
                action = action,
                args = args
            };
            var json = JsonConvert.SerializeObject(dispatchActionMsg);
            // Debug.Log(json);

            if (_isRunningStandalone)
            {
                _nodeJSProcess.StandardInput.WriteLine(json);
            }
            else
            {
                // -- Send message up to shell and let it do the signing and sending
                SendMessageRPC(json);
            }
        }

        public void SendSelectTileMsg(List<string> tileIDs)
        {
            var tileInteractionMsg = new SelectTileMessage
            {
                msg = "selectTile",
                tileIDs = tileIDs
            };
            var json = JsonConvert.SerializeObject(tileInteractionMsg);
            // Debug.Log(json);

            if (_isRunningStandalone)
            {
                _nodeJSProcess.StandardInput.WriteLine(json);
            }
            else
            {
                // -- Send interaction up to shell
                SendMessageRPC(json);
            }
        }

        public void SendDeselectAllTilesMsg()
        {
            SendSelectTileMsg(new List<string>());
        }

        // public void SendTileInteractionMsg(Vector3Int tileCubeCoords)
        // {
        //     Debug.LogWarning("PluginController::SendTileInteractionMsg() Deprecated - Use SendSelectTileMsg instead. tileCubeCoords: " + tileCubeCoords);

        //     var tileIDs = new List<string>();
        //     tileIDs.Add(NodeKinds.TileNode.GetKey(0, tileCubeCoords.x, tileCubeCoords.y, tileCubeCoords.z));

        //     SendSelectTileMsg(tileIDs);
        // }

        // -- MESSAGE IN

        public void OnState(string stateJson)
        {
            try
            {
                var state = JsonConvert.DeserializeObject<State>(stateJson);
                UpdateState(state);
            }
            catch (Exception e)
            {
                Debug.Log("PluginController::OnState():\n" + stateJson);
                Debug.LogError(e);
            }
        }

        public void OnMessage()
        {
            Debug.Log("Message Received from JS land");
        }

        public void OnTest()
        {
            Debug.Log("Message Received from JS land OnTest");
        }
    }
}
