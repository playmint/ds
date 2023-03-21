using UnityEngine;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

namespace Cog
{
    struct GenericMessage
    {
        public string msg;
    }

    struct SelectTileMessage
    {
        public string msg;
        public List<string> tileIDs;
    }

    struct SetIntentMessage
    {
        public string msg;
        public string intent;
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

        private void UpdateState(State state)
        {
            WorldState = state;
            _hasStateUpdated = true;
        }

#if UNITY_EDITOR

        // -- Dawnseekers Bridge node.js thread
        private string _nodePath;
        private string _privateKey;


        private Thread _nodeJSThread;
        private System.Diagnostics.Process _nodeJSProcess;

        protected void OnDestroy()
        {
            KillNodeProcess();
        }

        private void StartNodeProcess()
        {
            Debug.Log("StartNodeProcess()");

            _nodePath = DawnseekersDevSettings.instance.NodePath;
            _privateKey = DawnseekersDevSettings.instance.PrivateKey;

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
            if (DawnseekersDevSettings.instance.NodePath == "") 
            {
                Debug.LogError("PluginController: Node path not set. Make sure the absolute path to node is set in the Edit > Project Settings > Dawnseekers panel");
                return;
            }

            Debug.Log($"PluginController:NodeProcessThread() Starting DawnseekersBridge \nNodePath: {DawnseekersDevSettings.instance.NodePath} \nPrivKey: {DawnseekersDevSettings.instance.PrivateKey}");

            _nodeJSProcess = new System.Diagnostics.Process
            {
                StartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    WorkingDirectory = "../bridge",
                    FileName = _nodePath,
                    Arguments = "./dist/index.js " + _privateKey,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardInput = true,
                    CreateNoWindow = true
                }
            };

            try 
            {
                _nodeJSProcess.Start();
            }
            catch (Exception e)
            {
                Debug.LogError(e);
                Debug.LogError("PluginController: Unable to start bridge. Please check your Node path and make sure that the bridge has been built with npm run build");
                return;
            }

            while (!_nodeJSProcess.StandardOutput.EndOfStream)
            {
                var line = _nodeJSProcess.StandardOutput.ReadLine();
                
                if (line.Length > 0 && line[0] == '{')
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

        public void MoveSeeker(Seeker seeker, Vector3Int cellPosCube)
        {
            // function MOVE_SEEKER(uint32 sid, int16 q, int16 r, int16 s) external;
            DispatchAction(
                "MOVE_SEEKER",
                "0x" + seeker.Key, // TODO: Do the prefixing on the JS side when state is serialised
                cellPosCube.x,
                cellPosCube.y,
                cellPosCube.z
            );
        }

        public void ScoutTile(Vector3Int cellCubePos)
        {
            if (SeekerManager.Instance.Seeker != null)
            {
                // function SCOUT_SEEKER(uint32 sid, int16 q, int16 r, int16 s) external;
                DispatchAction(
                    "SCOUT_SEEKER", // TODO: Do the prefixing on the JS side when state is serialised
                    "0x" + SeekerManager.Instance.Seeker.Key,
                    cellCubePos.x,
                    cellCubePos.y,
                    cellCubePos.z
                );
            }
        }

        public void DispatchAction(string action, params object[] args)
        {
            var msg = new DispatchMessage
            {
                msg = "dispatch",
                action = action,
                args = args
            };
            var json = JsonConvert.SerializeObject(msg);
            SendMessage(json);
        }

        public void SendSelectTileMsg(List<string> tileIDs)
        {
            var msg = new SelectTileMessage { msg = "selectTiles", tileIDs = tileIDs };
            var json = JsonConvert.SerializeObject(msg);
            SendMessage(json);
        }

        public void SendSetIntentMsg(string intent)
        {
            var msg = new SetIntentMessage { msg = "setIntent", intent = intent };
            var json = JsonConvert.SerializeObject(msg);
            SendMessage(json);
        }

        public void SendCancelIntentionMsg()
        {
            var msg = new GenericMessage { msg = "cancelIntent" };
            var json = JsonConvert.SerializeObject(msg);
            SendMessage(json);
        }

        public void SendDeselectAllTilesMsg()
        {
            SendSelectTileMsg(new List<string>());
        }

        private new void SendMessage(string json)
        {
#if UNITY_EDITOR
            _nodeJSProcess.StandardInput.WriteLine(json);
#elif UNITY_WEBGL
            // -- Send interaction up to shell
            SendMessageRPC(json);
#endif
        }

        // -- MESSAGE IN
        private string _prevStateJson = "";

        public void OnState(string stateJson)
        {
            if (_prevStateJson == stateJson)
                return;

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
    }
}
