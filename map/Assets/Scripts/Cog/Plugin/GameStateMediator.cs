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

    struct SelectMobileUnitMessage
    {
        public string msg;
        public string mobileUnitID;
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
    public class GameState
    {
        [Newtonsoft.Json.JsonProperty(
            "player",
            Required = Newtonsoft.Json.Required.DisallowNull,
            NullValueHandling = Newtonsoft.Json.NullValueHandling.Ignore
        )]
        public ConnectedPlayer Player { get; set; }

        [Newtonsoft.Json.JsonProperty(
            "selected",
            Required = Newtonsoft.Json.Required.DisallowNull,
            NullValueHandling = Newtonsoft.Json.NullValueHandling.Ignore
        )]
        public Selection Selected { get; set; }

        [Newtonsoft.Json.JsonProperty(
            "world",
            Required = Newtonsoft.Json.Required.DisallowNull,
            NullValueHandling = Newtonsoft.Json.NullValueHandling.Ignore
        )]
        public World World { get; set; }
    }

    // TODO: No longer a PluginController. Rename to StateMediator
    public class GameStateMediator : MonoBehaviour
    {
        [DllImport("__Internal")]
        private static extern void SendMessageRPC(string msgJSON);

        [DllImport("__Internal")]
        private static extern void UnityReadyRPC();

        public static GameStateMediator Instance;

        public GameState gameState { get; private set; }

        [SerializeField]
        private string _account;

        private bool _hasStateUpdated;

        // -- EVENTS
        public Action<GameState> EventStateUpdated;

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
                    try
                    {
                        EventStateUpdated.Invoke(gameState);
                    }
                    catch (Exception e)
                    {
                        Debug.Log("GameStateMediator::Update() error");
                        Debug.LogError(e);
                    }
                }
            }
        }

        private void UpdateState(GameState state)
        {
            if (state != null)
            {
                gameState = state;
                if (state.Player != null)
                {
                    _account = state.Player.Addr as string;
                }
                _hasStateUpdated = true;
            }
        }

#if UNITY_EDITOR

        // -- Downstream Bridge node.js thread
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

            _nodePath = DownstreamDevSettings.instance.NodePath;
            _privateKey = DownstreamDevSettings.instance.PrivateKey;

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
            if (DownstreamDevSettings.instance.NodePath == "")
            {
                Debug.LogError("PluginController: Node path not set. Make sure the absolute path to node is set in the Edit > Project Settings > Downstream panel");
                return;
            }

            Debug.Log($"PluginController:NodeProcessThread() Starting DownstreamBridge \nNodePath: {DownstreamDevSettings.instance.NodePath} \nPrivKey: {DownstreamDevSettings.instance.PrivateKey}");

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
                        var state = JsonConvert.DeserializeObject<GameState>(line);
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

        public void MoveMobileUnit(MobileUnits mobileUnit, Vector3Int cellPosCube)
        {
            // function MOVE_MOBILE_UNIT(uint32 sid, int16 q, int16 r, int16 s) external;
            DispatchAction(
                "MOVE_MOBILE_UNIT",
                mobileUnit.Key,
                cellPosCube.x,
                cellPosCube.y,
                cellPosCube.z
            );
        }

        public void MoveMobileUnit(MobileUnit mobileUnit, Vector3Int cellPosCube)
        {
            // function MOVE_MOBILE_UNIT(uint32 sid, int16 q, int16 r, int16 s) external;
            DispatchAction(
                "MOVE_MOBILE_UNIT",
                mobileUnit.Key,
                cellPosCube.x,
                cellPosCube.y,
                cellPosCube.z
            );
        }

        public void ScoutTile(Vector3Int cellCubePos)
        {
            if (MobileUnitManager.instance.currentSelectedMobileUnit != null)
            {
                // function SCOUT_MOBILE_UNIT(uint32 sid, int16 q, int16 r, int16 s) external;
                DispatchAction(
                    "SCOUT_MOBILE_UNIT",
                    MobileUnitManager.instance.currentSelectedMobileUnit.Key,
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

        public void SendSelectMobileUnitMsg(string mobileUnitID)
        {
            var msg = new SelectMobileUnitMessage
            {
                msg = "selectMobileUnit",
                mobileUnitID = mobileUnitID
            };
            var json = JsonConvert.SerializeObject(msg);
            SendMessage(json);
        }

        public void SendSelectMobileUnitMsg()
        {
            var msg = new SelectMobileUnitMessage { msg = "selectMobileUnit" };
            var json = JsonConvert.SerializeObject(msg);
            SendMessage(json);
        }

        public void SendSetIntentMsg(string intent)
        {
            var msg = new SetIntentMessage { msg = "setIntent", intent = intent };
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

        public void OnState(string stateJson)
        {
            if (stateJson == "")
                return;

            try
            {
                var state = JsonConvert.DeserializeObject<GameState>(stateJson);
                UpdateState(state);
            }
            catch (Exception e)
            {
                Debug.Log("PluginController::OnState():\n" + stateJson);
                Debug.LogError(e);
            }
        }

        private GameState incoming;
        private GameState state;

        public void StartOnState(string json)
        {
            incoming = new GameState();
            incoming.World = JsonConvert.DeserializeObject<World>(json);
            incoming.World.Tiles = new List<Tiles2>();
            incoming.World.Players = new List<Players>();
            incoming.World.Buildings = new List<Buildings>();
            if (state != null)
            {
                if (state.World != null && state.World.Tiles != null)
                {
                    incoming.World.Tiles = state.World.Tiles;
                }
                if (state.World != null && state.World.Players != null)
                {
                    incoming.World.Players = state.World.Players;
                }
                if (state.World != null && state.World.Buildings != null)
                {
                    incoming.World.Buildings = state.World.Buildings;
                }
                incoming.Player = state.Player;
                incoming.Selected = state.Selected;
            }
        }

        public void SetSelectionState(string json)
        {
            if (json == "")
                return;

            try
            {
                incoming.Selected = JsonConvert.DeserializeObject<Selection>(json);
            }
            catch (Exception e)
            {
                Debug.LogError(e);
            }
        }

        public void ResetWorldPlayers()
        {
            incoming.World.Players = new List<Players>();
        }

        public void ResetWorldBuildings()
        {
            incoming.World.Buildings = new List<Buildings>();
        }

        public void ResetWorldTiles()
        {
            incoming.World.Tiles = new List<Tiles2>();
        }

        public void AddWorldTiles(string json)
        {
            if (json == "")
                return;

            try
            {
                List<Tiles2> tiles = JsonConvert.DeserializeObject<List<Tiles2>>(json);
                for (int i = 0; i < tiles.Count; i++)
                {
                    incoming.World.Tiles.Add(tiles[i]);
                }
            }
            catch (Exception e)
            {
                Debug.LogError(e);
            }
        }

        public void AddWorldPlayers(string json)
        {
            if (json == "")
                return;

            try
            {
                List<Players> players = JsonConvert.DeserializeObject<List<Players>>(json);
                for (int i = 0; i < players.Count; i++)
                {
                    incoming.World.Players.Add(players[i]);
                }
            }
            catch (Exception e)
            {
                Debug.LogError(e);
            }
        }

        public void AddWorldBuildings(string json)
        {
            if (json == "")
                return;

            try
            {
                List<Buildings> buildings = JsonConvert.DeserializeObject<List<Buildings>>(json);
                for (int i = 0; i < buildings.Count; i++)
                {
                    incoming.World.Buildings.Add(buildings[i]);
                }
            }
            catch (Exception e)
            {
                Debug.LogError(e);
            }
        }

        public void SetPlayer(string json)
        {
            if (json == "")
                return;

            try
            {
                incoming.Player = JsonConvert.DeserializeObject<ConnectedPlayer>(json);
            }
            catch (Exception e)
            {
                Debug.LogError(e);
            }
        }

        public void EndOnState()
        {
            state = incoming;
            incoming = new GameState();
            UpdateState(state);
        }
    }
}
