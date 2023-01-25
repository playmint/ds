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
        private string _gameID = "";

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
            
            // var variables = new JObject
            // {
            //     {"gameID", gameID}
            // };

            var variables = new JObject
            {
                {"gameID", "latest"}
            };

            _client.ExecuteQuery(Operations.FetchStateDocument, variables, (response) =>
            {
                // Debug.Log($"Graph response: {response.Result.ToString()}");

                switch (response.Type)
                {
                    case MessageType.GQL_DATA:
                        Debug.Log("GQL_DATA");

                        Debug.Log($"Raw response:" + response.Result.Data.ToString());

                        // Deserialise here
                        var state = response.Result.Data.ToObject<FetchStateQuery>();
                        
                        Debug.Log($"Testing graphQL object. Game.State.Block: {state.Game.State.Block}");
                        Debug.Log($"Testing graphQL object. Game.State.Tiles:");                        
                        foreach (var tile in state.Game.State.Tiles)
                        {
                            Debug.Log(tile.Biome);
                            Debug.Log($"zone: {tile.Coords[0]} q: {tile.Coords[1]} r: {tile.Coords[2]} s: {tile.Coords[3]}");
                        }

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

        public void OnTileClick(Vector3Int tileCubeCoords)
        {
            // Debug.Log("PluginController::OnTileClick() tileCubeCoords: " + tileCubeCoords);

            //-- Send out message here
            // Debug.Log("PluginController::OnTileClick() Sending message TILE_INTERACTION");
        }
    }

}