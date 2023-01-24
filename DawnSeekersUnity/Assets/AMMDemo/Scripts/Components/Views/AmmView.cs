using AMMDemo.Scripts.Components.ViewModels;
using AMMDemo.Scripts.Managers;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using GraphQL4Unity;
using System;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace AMMDemo.Scripts.Components.Views
{
    #region GetStateGQL
    public class GetStateGQL {
        #region members
        [JsonProperty("game")]
        public GameGQL Game { get; set; }
        #endregion
    }
    #endregion

    #region GameGQL
    public class GameGQL {
        #region members
        // [JsonProperty("id")]
        // public string ID { get; set; }
        [JsonProperty("state")]
        public StateGQL State { get; set; }
        #endregion 
    }
    #endregion 

    #region StateGQL
    public class StateGQL {
        #region members
        [JsonProperty("block")]
        public uint Block { get; set; }
        [JsonProperty("tiles")]
        public List<TileGQL> Tiles { get; set; }
        #endregion 
    }
    #endregion 

    public class TileGQL {
        #region members
        [JsonProperty("coords")]
        public List<string> Coords { get; set; }
        [JsonProperty("biome")]
        public uint Biome { get; set; }
        #endregion
    }


/*
            tiles: nodes(match: {kinds: [""Tile""]}) {
                coords: keys
                biome: value(match: {via: [{rel: ""Biome""}]})
                seed: node(match: {kinds: [""Seed""], via: [{rel: ""ProvidesEntropyTo"", dir: IN}]}) {
                key
                }
            }
*/


    public class AmmView : MonoBehaviour
    {
        [SerializeField]
        private TextMeshProUGUI _goldBalance;
        
        [SerializeField]
        private TextMeshProUGUI _stoneBalance;
        
        [SerializeField]
        private TextMeshProUGUI _buyPrice;
        
        [SerializeField]
        private TextMeshProUGUI _sellPrice;
        
        [SerializeField]
        private Button _buyButton;
        
        [SerializeField]
        private Button _sellButton;
        
        [SerializeField]
        private TMP_InputField _amountInput;
        
        [SerializeField]
        private GraphQLHttp _client;

        private AmmViewModel _ammViewModel;

        private void Start()
        {
            _ammViewModel = new AmmViewModel(StateManager.Instance);

            _buyButton.onClick.AddListener(OnBuyClick);
        }

        // ...stateFragment

        private string _getStateQuery = @"   
        fragment stateFragment on State {
            block
            tiles: nodes(match: {kinds: [""Tile""]}) {
                coords: keys
                biome: value(match: {via: [{rel: ""Biome""}]})
                seed: node(match: {kinds: [""Seed""], via: [{rel: ""ProvidesEntropyTo"", dir: IN}]}) {
                key
                }
            }
            seekers: nodes(match: {kinds: [""Seeker""]}) {
                key
                position: node(match: {kinds: [""Tile""], via:[{rel: ""Location""}]}) {
                    coords: keys
                }
                player: node(match: {kinds: [""Player""], via:[{rel: ""Owner""}]}) {
                    address: key
                }
                cornBalance: value(match: {via: [{rel: ""Balance""}]})
            }
        }

        query GetState($gameID: ID!) {
            game(id:$gameID) {
                id
                state {
                    ...stateFragment
                }
            }
        }
        ";



        private void OnBuyClick() 
        {
            Debug.Log("OnBuyClick()");

            var variables = new JObject
            {
                {"gameID", "latest"}
            };

            _client.ExecuteQuery(_getStateQuery, variables, (response) =>
            {
                // Debug.Log($"Graph response: {response.Result.ToString()}");

                switch (response.Type)
                {
                    case MessageType.GQL_DATA:
                        Debug.Log("GQL_DATA");

                        // Deserialise here
                        var test = response.Result.Data.ToObject<GetStateGQL>();
                        // Debug.Log($"Testing graphQL object. ID: {test.Game.ID}");
                        Debug.Log($"Testing graphQL object. Game.State.Block: {test.Game.State.Block}");
                        Debug.Log($"Testing graphQL object. Game.State.Tiles:");
                        foreach (var tile in test.Game.State.Tiles)
                        {
                            Debug.Log(tile.Biome);
                            Debug.Log($"x: {tile.Coords[0]} y: {tile.Coords[1]}");
                        }

                        // Debug.Log("Raw data: " + response.Result.Data.ToString());

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
    }
}