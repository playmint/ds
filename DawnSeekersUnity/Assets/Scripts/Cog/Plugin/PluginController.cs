using UnityEngine;
using Cog.GraphQL;
using GraphQL4Unity;
using Newtonsoft.Json.Linq;
using Cog.Account;
using Nethereum.Hex.HexConvertors.Extensions;
using System;
using System.Text;
using System.Linq;
using System.Collections;
using System.Runtime.InteropServices;

namespace Cog
{
    struct TileCubeCoords
    {
        public int q;
        public int r;
        public int s;
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

        [SerializeField]
        private GraphQLHttp _client;

        [SerializeField]
        private GraphQLWebsocket _clientWS;

        [SerializeField]
        private string _gameID = "";

        [SerializeField]
        private string _privateKey = "0xc14c1284a5ff47ce38e2ad7a50ff89d55ca360b02cdf3756cdb457389b1da223";

        public string Account { get; private set; }

        public State WorldState { get; private set; }

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
            InitWalletProvider();
#elif UNITY_WEBGL
            UnityReadyRPC();
#endif
        }

        // Is either trigged by READY message from shell or after the wallet is initialised if in editor
        public void OnReady(string account)
        {
            Debug.Log("PluginController::OnReady() account: " + account);
            Account = account;

            if (_client != null)
            {
                FetchState();

#if UNITY_WEBGL
                // NOTE: If in the editor but build set to WebGL, sockets don't work so we still poll
                Debug.Log("Is Unity WEBGL");
                StartCoroutine("PollStateUpdate");
#endif
            }

#if UNITY_EDITOR
            Debug.Log("Is Unity editor");
            if (_clientWS != null)
            {
                _clientWS.OpenEvent += OnSocketOpened;
                _clientWS.CloseEvent += OnSocketClosed;
                _clientWS.Connect = true;
                // NOTE: State listener is triggered after the socket is opened
            }
            else if (_client != null)
            {
                Debug.Log("PluginController::OnReady() Falling back to http client for state updates");
                StartCoroutine("PollStateUpdate");
            }
#endif
        }

        public void DispatchAction(byte[] action)
        {
#if  UNITY_EDITOR
            // -- Directly dispatch the action via GraphQL
            DirectDispatchAction(action);
#elif UNITY_WEBGL
            // -- Send message up to shell and let it do the signing and sending
            var actionHex = action.ToHex(true);
            // Debug.Log($"PluginController::DispatchAction() Sending Dispatch message len:{action.Length} action: " + actionHex);
            DispatchActionEncodedRPC(actionHex);
#endif
        }

        public void FetchState()
        {
            // Debug.Log("PluginController:FetchState()");

            var gameID = DEFAULT_GAME_ID;
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

                        try
                        {
                            // Deserialise here
                            var result = response.Result.Data.ToObject<FetchStateQuery>();
                            UpdateState(result.Game.State);
                        }
                        catch (Exception e)
                        {
                            Debug.LogError("PluginController:: OnStateSubscription: Unable to deserialise state");
                            Debug.Log(e);
                            Debug.Log(response.Result);
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

        public void UpdateState(State state)
        {
            if (WorldState == null || WorldState.Block != state.Block)
            {
                WorldState = state;
                if (EventStateUpdated != null)
                {
                    EventStateUpdated.Invoke(state);
                }
            }
        }

        private void StartStateListener()
        {
            Debug.Log("PluginController::StartStateListener()");

            var gameID = (_gameID != "")? _gameID : DEFAULT_GAME_ID;

            var variables = new JObject
            {
                {"gameID", gameID}
            };

            IGraphQL client;
#if  UNITY_EDITOR
            client = _clientWS;
#else
            client = _client;
#endif

            client.ExecuteQuery(Operations.OnStateSubscription, variables, (response) =>
            {
                Debug.Log($"Graph response: {response.Result.ToString()}");

                switch (response.Type)
                {
                    case MessageType.GQL_DATA:
                        // Debug.Log("GQL_DATA");

                        // Deserialise here
                        try
                        {
                            var result = response.Result.Data.ToObject<OnStateSubscription>();
                            UpdateState(result.State);
                        }
                        catch
                        {
                            Debug.LogError("PluginController:: OnStateSubscription: Unable to deserialise state");
                            Debug.Log(response.Result);
                        }

                        break;

                    case MessageType.GQL_ERROR:
                        foreach (var error in response.Result.Errors)
                        {
                            DisplayError(error.ToString());
                        }
                        break;
                    case MessageType.GQL_COMPLETE:
                        DisplayMessage($"Complete {response}");
                        break;
                    case MessageType.GQL_EXCEPTION:
                        DisplayError($"Exception {response.Result}");
                        break;
                    default:
                        throw new ArgumentOutOfRangeException();
                }
            });
        }

        // -- AUTH FOR STANDALONE

        /**
         *  Used when running Unity in the editor so graphQL mutations can be made
         */
        private void AuthorizePublicKey()
        {
            // build a session auth message
            var sessionAddress = AccountManager.Instance.SessionPublicKey.HexToByteArray();

            Debug.Log("PluginController::AuthorizePublicKey(): " + sessionAddress.ToHex(true));

            var signInMessage = Encoding.UTF8.GetBytes("You are signing in with session: ");
            var authMessage = signInMessage.Concat(sessionAddress).ToArray();

            // sign it and submit mutation
            AccountManager.Instance.SignMessage(authMessage , (signedMessage) =>
            {
                var gameID = (_gameID != "")? _gameID : DEFAULT_GAME_ID;
                var variables = new JObject
                {
                    {"gameID", gameID},
                    {"session", AccountManager.Instance.SessionPublicKey},
                    {"auth", signedMessage},
                };
                _client.ExecuteQuery(Operations.SigninDocument, variables, (response) =>
                {
                    switch (response.Type)
                    {
                        case MessageType.GQL_DATA:
                            var success = bool.Parse(response.Result.Data["signin"]?.ToString() ?? string.Empty);

                            if (success)
                            {
                                Debug.Log("PluginController: Successfully signed into COG");
                                OnPublicKeyAuthorized();
                            }

                            break;
                        case MessageType.GQL_ERROR:
                            foreach (var error in response.Result.Errors)
                            {
                                DisplayError(error.ToString());
                            }
                            break;
                        case MessageType.GQL_COMPLETE:
                            DisplayMessage($"Complete {response}");
                            break;
                        case MessageType.GQL_EXCEPTION:
                            DisplayError($"Exception {response.Result}");
                            break;
                        default:
                            throw new ArgumentOutOfRangeException();
                    }
                });
            }, DisplayError);
        }

        private void DisplayMessage(object message)
        {
            Debug.Log(message);
        }

        private void DisplayError(object error)
        {
            Debug.LogError(error);
        }

        private void DirectDispatchAction(byte[] actionBytes)
        {
            // Debug.Log("PluginController:DirectDispatchAction: " + actionBytes.ToHex(true));

            AccountManager.Instance.HashAndSignSession(actionBytes, (auth) =>
            {
                var gameID = (_gameID != "")? _gameID : DEFAULT_GAME_ID;
                var variables = new JObject
                {
                    {"gameID", gameID},
                    {"action", actionBytes.ToHex(true)},
                    {"auth", auth}
                };
                _clientWS.ExecuteQuery(Operations.DispatchDocument, variables, genericGqlHandler);
            },
            DisplayError
            );
        }

        // -- MESSAGE OUT

        public void SendTileInteractionMsg(Vector3Int tileCubeCoords)
        {
            Debug.Log("PluginController::OnTileClick() tileCubeCoords: " + tileCubeCoords);

#if  UNITY_EDITOR
            OnTileInteraction(tileCubeCoords);
#else
            TileInteractionRPC(tileCubeCoords.x, tileCubeCoords.y, tileCubeCoords.z);
#endif
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

        private void OnSocketOpened()
        {
            Debug.Log("PluginController: Socket opened");

            StartStateListener();
        }

        private void InitWalletProvider()
        {
            Debug.Log("PluginController::InitWalletProvider()");

            AccountManager.Instance.InitProvider(
                WalletProviderEnum.PRIVATE_KEY,
                _privateKey
            );

            AccountManager.Instance.ConnectedEvent += OnWalletConnect;
            AccountManager.Instance.Connect();
        }

        private void OnWalletConnect()
        {
            AuthorizePublicKey();
        }

        private void OnPublicKeyAuthorized()
        {
            OnReady(AccountManager.Instance.Account);
        }

        private void OnSocketClosed()
        {
            Debug.Log("PluginController: Socket closed");
        }

        private void genericGqlHandler(Message response)
        {
            switch (response.Type)
            {
                case MessageType.GQL_DATA:
                    DisplayMessage($"Data {response}");
                    Debug.Log(response.Result);
                    break;
                case MessageType.GQL_ERROR:
                    foreach (var error in response.Result.Errors)
                    {
                        DisplayError(error.ToString());
                    }
                    break;
                case MessageType.GQL_COMPLETE:
                    DisplayMessage($"Complete {response}");
                    break;
                case MessageType.GQL_EXCEPTION:
                    DisplayError($"Exception {response.Result}");
                    break;
                default:
                    throw new ArgumentOutOfRangeException();
            }
        }

        IEnumerator PollStateUpdate() {
            for(;;) {
                FetchState();
                yield return new WaitForSeconds(2f);
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