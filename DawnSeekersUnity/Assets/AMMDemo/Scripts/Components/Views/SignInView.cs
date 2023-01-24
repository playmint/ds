using System;
using System.Linq;
using System.Text;
using Cog.Account;
using AMMDemo.GraphQL.Generated;
using GraphQL4Unity;
using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.Util;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.UI;

namespace AMMDemo.Scripts.Components.Views
{
    public class SignInView : MonoBehaviour
    {
        [SerializeField]
        private Button _signInButton;
        
        [SerializeField] 
        private GraphQLHttp _client;

        [SerializeField] 
        private GameObject _ammView;
        
        private void Start()
        {
            _signInButton.onClick.AddListener(OnSignInClicked);
            
            if (_client != null)
            {
                _client.URL = "http://localhost:8080/query";
            }
        }

        private void OnSignInClicked()
        {
            // build a session auth message
            var sessionAddress = AccountManager.Instance.SessionPublicKey.HexToByteArray();
            var signInMessage = Encoding.Unicode.GetBytes("You are signing in with session: ");
            var authMessage = Sha3Keccack.Current.CalculateHash(
                Encoding.Unicode.GetBytes($"\x19Ethereum Signed Message:\n{signInMessage.Length + 20}")
                    .Concat(signInMessage)
                    .Concat(sessionAddress)
                    .ToArray()
            );

            // sign it and submit mutation
            AccountManager.Instance.SignMessage(authMessage.ToString(), (signedMessage) =>
            {
                var variables = new JObject
                {
                    {"gameID", "latest"},
                    {"session", AccountManager.Instance.SessionPublicKey},
                    {"auth", signedMessage},
                };
                _client.ExecuteQuery(SigninGQL.SigninDocument, variables, (response) =>
                {
                    switch (response.Type)
                    {
                        case MessageType.GQL_DATA:
                            var success = bool.Parse(response.Result.Data["signin"]?.ToString() ?? string.Empty);

                            if (success)
                            {
                                gameObject.SetActive(false);
                                _ammView.SetActive(true);
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
    }
}