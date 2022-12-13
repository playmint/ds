using System;
using Cog.Account;
using UnityEngine;
using UnityEngine.UI;

namespace AMMDemo.Scripts.Components.Views
{
    public class ConnectWalletView : MonoBehaviour
    {
        [SerializeField]
        private Button _privateKeyConnectButton;
        
        [SerializeField]
        private Button _metamaskConnectButton;
        
        [SerializeField]
        private Button _walletConnectButton;

        [SerializeField] 
        private GameObject _signInView;

        private void Start()
        {
            _privateKeyConnectButton.onClick.AddListener(OnPrivateKeyConnectButtonClicked);
            _metamaskConnectButton.onClick.AddListener(OnMetamaskConnectButtonClicked);
            _walletConnectButton.onClick.AddListener(OnWalletConnectConnectButtonClicked);
            AccountManager.Instance.ConnectedEvent += OnWalletConnected;
            AccountManager.Instance.ErrorEvent += DisplayError;
        }
        
        private void OnMetamaskConnectButtonClicked()
        {
            if (!AccountManager.Instance.IsMetamaskAvailable())
            {
                DisplayError("Metamask NOT Available, if running in editor use Private Key");
                return;
            }

            AccountManager.Instance.InitProvider(WalletProviderEnum.METAMASK);
            AccountManager.Instance.Connect();
        }

        private void OnPrivateKeyConnectButtonClicked()
        {
            if (!AccountManager.Instance.IsPrivateKeyConnectAvailable())
            {
                DisplayError("Private Key Connect NOT Available, if running in web useMetamask or similar");
                return;
            }

            AccountManager.Instance.InitProvider(WalletProviderEnum.PRIVATE_KEY,
                "0xc14c1284a5ff47ce38e2ad7a50ff89d55ca360b02cdf3756cdb457389b1da223");
            AccountManager.Instance.Connect();
        }
        
        private void OnWalletConnectConnectButtonClicked()
        {
            if (!AccountManager.Instance.IsWalletConnectAvailable())
            {
                DisplayError("WalletConnect is NOT Available, if running in editor use Private Key");
                return;
            }

            AccountManager.Instance.InitProvider(WalletProviderEnum.WALLETCONNECT);
            AccountManager.Instance.Connect();
        }

        private void  OnWalletConnected()
        {
            if (AccountManager.Instance.Account == string.Empty) return;
            
            DisplayMessage("Wallet Connected to "+AccountManager.Instance.Account);
            DisplayMessage("Session Key generated for "+AccountManager.Instance.SessionPublicKey);
            
            // todo determine if user has an account
            gameObject.SetActive(false);
            _signInView.SetActive(true);
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