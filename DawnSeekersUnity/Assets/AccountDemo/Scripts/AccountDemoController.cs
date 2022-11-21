
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Cog.Account;


public class AccountDemoController : MonoBehaviour
{
    [SerializeField]
    private Button _btnMetamaskConnect;
    [SerializeField]
    private Button _btnPrivateKeyConnect;
    [SerializeField]
    private Button _btnSignMessage;
    [SerializeField]
    private Button _btnGetAccount;
    [SerializeField]
    private TMP_Text  _lblMesssage;
    [SerializeField]
    private TMP_Text _lblError;

    private TMP_Text _txtSmartContractAddress;


    protected void Start()
    {

        _btnMetamaskConnect.onClick.AddListener( MetamaskConnectButton_Clicked);
        _btnPrivateKeyConnect.onClick.AddListener( PrivateKeyConnectButton_Clicked);
        _btnSignMessage.onClick.AddListener (SignData_Clicked);
        _btnGetAccount.onClick.AddListener(GetAccount_Clicked);
        AccountManager.Instance.ConnectedEvent += () => DisplayMessage("Wallet Connected");
        AccountManager.Instance.ErrorEvent += (error) => DisplayError(error);
        DisplayMessage("Account / Auth Demo Started");
    }

    private void GetAccount_Clicked()
    {
        //TODO wire this to the backend so it passses a signed messsage with the account address and retrieves the auth token
       if (AccountManager.Instance.IsConnected())
       {
            DisplayMessage(AccountManager.Instance.Account);
       }
       else
       {
            DisplayError("Wallet not conencted please connect account first");
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
            DisplayError("Metamask NOT Available, if runnning in editor use Private Key");
       }
    }
    private void Connect()
    {
        AccountManager.Instance.Connect();
    }

    private void PrivateKeyConnectButton_Clicked()
    {
       DisplayMessage("MetamaskConnectButton_Clicked");
       if (AccountManager.Instance.IsPrivateKeyConnectAvaiable())
       {
            AccountManager.Instance.InitProvider(WalletProviderEnum.PRIVATE_KEY, "0xc14c1284a5ff47ce38e2ad7a50ff89d55ca360b02cdf3756cdb457389b1da223");
            Connect();
       }
       else 
       {
            DisplayError("Private Key Connect NOT Available, if runnning in web useMetamask or similar");
       }
    }

    private void SignData_Clicked()
    {
        Debug.Log("SignData_Clicked");
        AccountManager.Instance.SignMessage("Hello World", (signedMesage) => DisplayMessage(signedMesage), (error)=> DisplayError(error));
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
