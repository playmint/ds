using UnityEngine;
using Cog.GraphQL;
using GraphQL4Unity;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Cog.Account;
using Nethereum.Hex.HexConvertors.Extensions;
using System;
using System.Text;
using System.Linq;
using System.Collections;
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
        private static extern void DispatchActionEncodedRPC(string action);

        [DllImport("__Internal")]
        private static extern void UnityReadyRPC();

        [DllImport("__Internal")]
        private static extern void TileInteractionRPC(int q, int r, int s);

        private const string DEFAULT_GAME_ID = "DAWNSEEKERS";

        public static PluginController Instance;

        private IGraphQL _activeClient;

        [SerializeField]
        private string _gameID = "";

        [SerializeField]
        private string _privateKey =
            "0xc14c1284a5ff47ce38e2ad7a50ff89d55ca360b02cdf3756cdb457389b1da223";

        private bool _isRunningStandalone = false;

        public string Account { get; private set; }

        public State WorldState { get; private set; }

        private Thread _nodeJSThread;
        private System.Diagnostics.Process _nodeJSProcess;

        // -- Events
        public Action<State> EventStateUpdated;
        public Action<Vector3Int> EventTileInteraction;

        protected void Awake()
        {
            Instance = this;
        }

        protected void Start()
        {
            Debug.Log("PluginController::Start()");

#if UNITY_EDITOR
            StartNodeProcess();
#elif UNITY_WEBGL
            UnityReadyRPC();
#endif
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
                    Arguments = "build/src/index.js",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true
                }
            };

            _nodeJSProcess.Start();

            while (!_nodeJSProcess.StandardOutput.EndOfStream)
            {
                var line = _nodeJSProcess.StandardOutput.ReadLine();
                Debug.Log("Node process out:\n" + line);
                try 
                {
                    var state = JsonConvert.DeserializeObject<State>(line);
                    UpdateState(state);
                } 
                catch (Exception e) 
                {
                    Debug.LogError(e);
                }
            }

            Debug.Log("Node process exiting");

            _nodeJSProcess.WaitForExit();

            Debug.Log("Kill thread");
        }

        public void DispatchAction(byte[] action)
        {
            if (_isRunningStandalone)
            {
                // -- Directly dispatch the action via GraphQL
                DirectDispatchAction(action);
            }
            else
            {
                // -- Send message up to shell and let it do the signing and sending
                var actionHex = action.ToHex(true);
                // Debug.Log($"PluginController::DispatchAction() Sending Dispatch message len:{action.Length} action: " + actionHex);
                DispatchActionEncodedRPC(actionHex);
            }
        }

        public void FetchState()
        {
            Debug.LogError("PluginController:FetchState() deprecated");
        }

        public void UpdateState(State state)
        {
            WorldState = state;
            if (EventStateUpdated != null)
            {
                EventStateUpdated.Invoke(state);
            }
        }

        // -- AUTH FOR STANDALONE

        private void DirectDispatchAction(byte[] actionBytes)
        {
            // Debug.Log("PluginController:DirectDispatchAction: " + actionBytes.ToHex(true));

            // var variables = new JObject
            // {
            //     { "gameID", gameID },
            //     { "action", actionBytes.ToHex(true) },
            //     { "auth", auth }
            // };
        }

        // -- MESSAGE OUT

        public void SendTileInteractionMsg(Vector3Int tileCubeCoords)
        {
            Debug.Log("PluginController::OnTileClick() tileCubeCoords: " + tileCubeCoords);

            if (_isRunningStandalone)
            {
                // -- Call the tile interaction handler directly as there is no shell to broadcast the message
                OnTileInteraction(tileCubeCoords);
            }
            else
            {
                // -- Send interaction up to shell
                TileInteractionRPC(tileCubeCoords.x, tileCubeCoords.y, tileCubeCoords.z);
            }
        }

        // -- MESSAGE IN

        private void OnTileInteraction(string tileCubeCoordsJson)
        {
            Debug.Log("OnTileInteraction(): " + tileCubeCoordsJson);
            var tileCubeCoords = JsonUtility.FromJson<TileCubeCoords>(tileCubeCoordsJson);
            Debug.Log("OnTileInteraction(): deserialsed: " + tileCubeCoords);
            OnTileInteraction(new Vector3Int(tileCubeCoords.q, tileCubeCoords.r, tileCubeCoords.s));
        }

        private void OnTileInteraction(Vector3Int tileCubeCoords)
        {
            if (EventTileInteraction != null)
            {
                EventTileInteraction.Invoke(tileCubeCoords);
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
