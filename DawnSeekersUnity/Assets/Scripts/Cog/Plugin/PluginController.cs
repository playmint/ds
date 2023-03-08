using UnityEngine;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

namespace Cog
{
    struct TileCubeCoords
    {
        public int q;
        public int r;
        public int s;
    }

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
        [Newtonsoft.Json.JsonProperty("game", Required = Newtonsoft.Json.Required.DisallowNull, NullValueHandling = Newtonsoft.Json.NullValueHandling.Ignore)]
        public GameState Game { get; set; }
        
        [Newtonsoft.Json.JsonProperty("ui", Required = Newtonsoft.Json.Required.DisallowNull, NullValueHandling = Newtonsoft.Json.NullValueHandling.Ignore)]
        public UIState UI { get; set; }
    }

    public class PluginController : MonoBehaviour
    {
        [DllImport("__Internal")]
        private static extern void DispatchActionRPC(string action, params object[] args);

        [DllImport("__Internal")]
        private static extern void UnityReadyRPC();

        [DllImport("__Internal")]
        private static extern void SelectTilesRPC(List<string> tileIDs);

        private const string DEFAULT_GAME_ID = "DAWNSEEKERS";

        public static PluginController Instance;

        [SerializeField]
        private string _gameID = "";

        [SerializeField]
        private string _privateKey =
            "0xc14c1284a5ff47ce38e2ad7a50ff89d55ca360b02cdf3756cdb457389b1da223";

        private bool _isRunningStandalone = false;

        public string Account { get; private set; }

        public State WorldState { get; private set; }

        private bool _hasStateUpdated;

        private Thread _nodeJSThread;
        private System.Diagnostics.Process _nodeJSProcess;

        // -- Events
        public Action<State> EventStateUpdated;

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
            // state events get dispatched in the update loop as so anything reacting to the event is happening in the main thread
            if (_hasStateUpdated)
            {
                _hasStateUpdated = false;
                if (EventStateUpdated != null)
                {
                    EventStateUpdated.Invoke(WorldState);
                }
            }
        }

        protected void OnDestroy()
        {
#if UNITY_EDITOR
            KillNodeProcess();
#endif   
        }

        // Called by the generated HTML wrapper and used when testing WebGL outside of the shell
        public void ReadyStandalone()
        {

        }

        // Is either trigged by READY message from shell or after the wallet is initialised if run in editor or run as standalone WebGL
        public void OnReady(string account)
        {
            Debug.Log("OnReady()");
#if UNITY_EDITOR

#endif
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

        // FileName = "/Users/hypnoshock/.nvm/versions/node/v16.19.0/bin/node",
        // Arguments = "build/src/index.js",

        // FileName = "/bin/sh",
        // Arguments = "npx ts-node src/index.ts",
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

        public void UpdateState(State state)
        {
            WorldState = state;
            _hasStateUpdated = true;
        }

        // -- MESSAGE OUT

        public void DispatchAction(string action, params object[] args)
        {
            if (_isRunningStandalone)
            {
                var dispatchActionMsg = new DispatchMessage{ msg = "dispatch", action = action, args = args};
                var json = JsonConvert.SerializeObject(dispatchActionMsg);
                Debug.Log(json);
                _nodeJSProcess.StandardInput.WriteLine(json);
            }
            else
            {
                // -- Send message up to shell and let it do the signing and sending
                DispatchActionRPC(action, args);
            }
        }

        public void SendTileInteractionMsg(Vector3Int tileCubeCoords)
        {
            Debug.Log("PluginController::SendTileInteractionMsg() tileCubeCoords: " + tileCubeCoords);

            var tileIDs = new List<string>();
            tileIDs.Add(NodeKinds.TileNode.GetKey(0, tileCubeCoords.x, tileCubeCoords.y, tileCubeCoords.z));

            if (_isRunningStandalone)
            {
                var tileInteractionMsg = new SelectTileMessage{ msg = "selectTile", tileIDs = tileIDs };
                var json = JsonConvert.SerializeObject(tileInteractionMsg);
                // Debug.Log(json);
                _nodeJSProcess.StandardInput.WriteLine(json);
            }
            else
            {
                // -- Send interaction up to shell
                SelectTilesRPC(tileIDs);
            }
        }

        // -- LISTENERS


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
