using UnityEngine;
using Cog.GraphQL;
using GraphQL4Unity;
using Newtonsoft.Json.Linq;
using System;

namespace Cog
{
    public class PluginController : MonoBehaviour
    {
        public static PluginController Instance;

        [SerializeField]
        private GraphQLHttp _client;

        [SerializeField]
        private GraphQLWebsocket _clientWS;

        [SerializeField]
        private string _gameID = "";

        public State State {get; private set;}

        // -- Events
        public Action<State> StateUpdated;

        protected void Awake()
        {
            Instance = this;
        }

        protected void Start()
        {
            if (_client != null)
            {
                _client.URL = "http://localhost:8080/query";
            }

            if (_clientWS != null)
            {
                _clientWS.Url = "ws://localhost:8080/query";
                _clientWS.OpenEvent += OnSocketOpened;
                _clientWS.CloseEvent += OnSocketClosed;
                _clientWS.Connect = true;
            }
        }
        public void DispatchAction(string actionName, params object[] args)
        {
            Debug.Log($"PluginController::DispatchAction() actionName: {actionName} args:");
            foreach(var arg in args) {
                Debug.Log(arg);
            }
        }

        public void FetchState()
        {
            var gameID = "latest";
            if (_gameID != "") gameID = _gameID;
            
            var variables = new JObject
            {
                {"gameID", gameID}
            };

            _client.ExecuteQuery(Operations.FetchStateDocument, variables, (response) =>
            {
                // Debug.Log($"Graph response: {response.Result.ToString()}");

                switch (response.Type)
                {
                    case MessageType.GQL_DATA:
                        // Debug.Log("GQL_DATA");

                        // Deserialise here
                        var result = response.Result.Data.ToObject<FetchStateQuery>();
                        UpdateState(result.Game.State);
                        break;

                    case MessageType.GQL_ERROR:
                        Debug.Log("GQL_ERROR");
                        break;

                    case MessageType.GQL_COMPLETE:
                        Debug.Log("GQL_COMPLETE");

                        break;
                    case MessageType.GQL_EXCEPTION:
                        Debug.Log("GQL_EXCEPTION");

                        break;
                    default:
                        throw new ArgumentOutOfRangeException();
                }
            });
        }

        public void UpdateState(State state) 
        {
            State = state;
            if (StateUpdated != null)
            {
                StateUpdated.Invoke(state);
            }
        }

        public void OnTileClick(Vector3Int tileCubeCoords)
        {
            // Debug.Log("PluginController::OnTileClick() tileCubeCoords: " + tileCubeCoords);

            //-- Send out message here
            // Debug.Log("PluginController::OnTileClick() Sending message TILE_INTERACTION");
        }

        private void OnSocketOpened()
        {
            Debug.Log("PluginController: Socket opened");

            var gameID = "latest";
            if (_gameID != "") gameID = _gameID;
            
            var variables = new JObject
            {
                {"gameID", gameID}
            };

            _clientWS.ExecuteQuery(Operations.OnStateSubscription, variables, (response) =>
            {
                // Debug.Log($"Graph response: {response.Result.ToString()}");

                switch (response.Type)
                {
                    case MessageType.GQL_DATA:
                        Debug.Log("GQL_DATA");

                        // Deserialise here
                        Debug.Log(response.Result.Data);
                        var result = response.Result.Data.ToObject<OnStateSubscription>();
                        UpdateState(result.State);

                        break;

                    case MessageType.GQL_ERROR:
                        Debug.Log("GQL_ERROR");
                        break;

                    case MessageType.GQL_COMPLETE:
                        Debug.Log("GQL_COMPLETE");

                        break;
                    case MessageType.GQL_EXCEPTION:
                        Debug.Log("GQL_EXCEPTION");

                        break;
                    default:
                        throw new ArgumentOutOfRangeException();
                }
            });

            FetchState();
        }

        private void OnSocketClosed()
        {
            Debug.Log("PluginController: Socket closed");
        }
    }

}