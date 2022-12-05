
using System;
using System.Linq;
using System.Text;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Cog.Account;
using Cog.GraphQL.Generated;
using GraphQL4Unity;
using Nethereum.ABI;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.Util;
using Newtonsoft.Json.Linq;


public class AccountDemoController : MonoBehaviour
{
    [SerializeField]
    private Button _btnMetamaskConnect;
    [SerializeField]
    private Button _btnPrivateKeyConnect;
    [SerializeField]
    private Button _btnWalletConnectConnect;
    [SerializeField]
    private Button _btnSignUp;
    [SerializeField]
    private Button _btnSignIn;
    [SerializeField]
    private Button _btnGetAccounts;
    [SerializeField]
    private Button _btnSignMessage;
    [SerializeField]
    private Button _btnSignSessionMessage;
    [SerializeField]
    private Button _btnGetAccount;
    [SerializeField]
    private TMP_Text  _lblMesssage;
    [SerializeField]
    private TMP_Text _lblError;
    [SerializeField] 
    private GraphQLHttp _client;
    
    private TMP_Text _txtSmartContractAddress;

    private string _accountId;

    protected void Start()
    {

          _btnMetamaskConnect.onClick.AddListener( MetamaskConnectButton_Clicked);
          _btnPrivateKeyConnect.onClick.AddListener( PrivateKeyConnectButton_Clicked);
          _btnWalletConnectConnect.onClick.AddListener (WalletConnectConnectButton_Clicked);
          _btnSignUp.onClick.AddListener(SignUp_Clicked);
          _btnSignIn.onClick.AddListener(SignIn_Clicked);
          _btnGetAccounts.onClick.AddListener(GetAccounts_Clicked);
          _btnSignMessage.onClick.AddListener (SignData_Clicked);
          _btnSignSessionMessage.onClick.AddListener (SignSession_Clicked);
          _btnGetAccount.onClick.AddListener(GetAccount_Clicked);
          AccountManager.Instance.ConnectedEvent += () => OnWalletConnected();
          AccountManager.Instance.ErrorEvent += (error) => DisplayError(error);
          DisplayMessage("Account / Auth Demo Started");

          if (_client != null)
          {
              _client.URL = "http://localhost:3081/query";
          }
    }

    private void SignUp_Clicked()
    {
        var variables = new JObject {{"account", AccountManager.Instance.Account}};
        _client.ExecuteQuery(SignupGQL.SignupDocument, variables, (response) =>
        {
            // TODO check for error response
            DisplayMessage(response.Result.Data.ToString());
        });
    }

    public class AuthorisationMessage
    {
        [Parameter("string", 1)] public string Operation { get; set; }
        [Parameter("address", 2)] public byte[] SessionPublicKey { get; set; }
    }
    
    private void SignIn_Clicked()
    {
        // build a session auth message
        var abiEncode = new ABIEncode();
        var packed = abiEncode.GetABIEncodedPacked(new AuthorisationMessage
        {
            Operation = "signin",
            SessionPublicKey = AccountManager.Instance.SessionPublicKey.HexToByteArray()
        });
        var authData = Sha3Keccack.Current.CalculateHash(packed);
        var authMessage = Sha3Keccack.Current.CalculateHash(
            Encoding.Unicode.GetBytes($"\x19Ethereum Signed Message:\n{authData.Length}")
                .Concat(authData).ToArray()
        );
        
        // sign it and submit mutation
        AccountManager.Instance.SignMessage(authMessage.ToString(), (signedMessage) =>
        {
            var variables = new JObject
            {
                {"account", AccountManager.Instance.Account},
                {"session", AccountManager.Instance.SessionPublicKey},
                {"authorization", signedMessage},
            };
            _client.ExecuteQuery(SigninGQL.SigninDocument, variables, (response) =>
            {
                // TODO error responses coming back as data!?
                switch (response.Type)
                {
                    case MessageType.GQL_DATA:
                        DisplayMessage(response.Result.ToString());
                        break;
                    case MessageType.GQL_ERROR:
                        foreach (var error in response.Result.Errors)
                        {
                            DisplayError(error.ToString());
                        }
                        break;
                    case MessageType.GQL_COMPLETE:
                        Debug.Log($"Complete {response}");
                        break;
                    case MessageType.GQL_EXCEPTION:
                        Debug.Log($"Exception {response}");
                        break;
                    default:
                        throw new ArgumentOutOfRangeException();
                }
            });
        }, DisplayError);
    }

    private void GetAccounts_Clicked()
    {
        if (AccountManager.Instance.IsConnected())
        {
            DisplayMessage($"Fetching accounts {AccountManager.Instance.Account}");
            var variables = new JObject {{"owner", AccountManager.Instance.Account}};
            _client.ExecuteQuery(GetAccountsGQL.GetAccountsDocument, variables, (Message response) =>
            {
                // TODO error responses coming back as data!?
                switch (response.Type)
                {
                    case MessageType.GQL_DATA:
                        DisplayMessage(response.Result.ToString());
                        
                        // deserialize the result
                        var query = response.Result.Data.ToObject<Cog.GraphQL.Generated.Types.Query>();
                        var account = query?.accounts[0];
                        _accountId = account?.id;

                        break;
                    case MessageType.GQL_ERROR:
                        foreach (var error in response.Result.Errors)
                        {
                            DisplayError(error.ToString());
                        }
                        break;
                    case MessageType.GQL_COMPLETE:
                        Debug.Log($"Complete {response}");
                        break;
                    case MessageType.GQL_EXCEPTION:
                        Debug.Log($"Exception {response}");
                        break;
                    default:
                        throw new ArgumentOutOfRangeException();
                }
            });
        }
        else
        {
            DisplayError("Wallet not connected please connect account first");
        }
    }
    
    private void GetAccount_Clicked()
    {
        // TODO wire this to the backend so it passes a signed message with the account address and retrieves the auth token
       if (AccountManager.Instance.IsConnected())
       {
            DisplayMessage($"Fetching account {AccountManager.Instance.Account}");
            var variables = new JObject {{"id", _accountId}};
            _client.ExecuteQuery(GetAccountGQL.GetAccountDocument, variables, (Message response) =>
            {
                DisplayMessage(response.Result.Data.ToString());
            });
       }
       else
       {
            DisplayError("Wallet not connected please connect account first");
       }
    }

    private void MetamaskConnectButton_Clicked()
    {
       if (AccountManager.Instance.IsMetamaskAvailable())
       {
            AccountManager.Instance.InitProvider(WalletProviderEnum.METAMASK);
            Connect();
       }
       else
       {
            DisplayError("Metamask NOT Available, if running in editor use Private Key");
       }
    }

     private void WalletConnectConnectButton_Clicked()
     {
          Debug.Log("WalletConnectConnectButton_Clicked");   
          if (AccountManager.Instance.IsWalletConnectAvailable())
          {
               AccountManager.Instance.InitProvider(WalletProviderEnum.WALLETCONNECT);
               Connect();
          }
          else
          {
               DisplayError("WalletConnect is NOT Available, if runnning in editor use Private Key");
          }
     }
    private void Connect()
    {
        AccountManager.Instance.Connect();
    }

    private void PrivateKeyConnectButton_Clicked()
    {
       DisplayMessage("MetamaskConnectButton_Clicked");
       if (AccountManager.Instance.IsPrivateKeyConnectAvailable())
       {
            AccountManager.Instance.InitProvider(WalletProviderEnum.PRIVATE_KEY, "0xc14c1284a5ff47ce38e2ad7a50ff89d55ca360b02cdf3756cdb457389b1da223");
            Connect();
       }
       else 
       {
            DisplayError("Private Key Connect NOT Available, if running in web useMetamask or similar");
       }
    }

    private void SignData_Clicked()
    {
        Debug.Log("SignData_Clicked");
        AccountManager.Instance.SignMessage("Hello World", (signedMessage) => DisplayMessage(signedMessage), (error)=> DisplayError(error));
    }
    private void SignSession_Clicked()
    {
        Debug.Log("SignSession_Clicked");
        AccountManager.Instance.SignSession("Hello World", (signedMessage) => DisplayMessage(signedMessage), (error)=> DisplayError(error));
    }
    public void  OnWalletConnected() 
    {
          if (AccountManager.Instance.Account!="")
          {
               DisplayMessage("Wallet Connected to "+AccountManager.Instance.Account);
               DisplayMessage("Session Key generated for "+AccountManager.Instance.SessionPublicKey);
          }
    }
    public void DisplayMessage(string message)
    {
         _lblMesssage.text += "\n";
        _lblMesssage.text += message;
    }

    public void DisplayError(string errorMessage)
    {
        _lblError.text += "\n";
        _lblError.text += errorMessage;
    }
}
