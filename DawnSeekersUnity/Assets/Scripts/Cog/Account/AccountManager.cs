using System;
using UnityEngine;
namespace Cog.Account
{

    public enum WalletProviderEnum 
    {
        NONE,
        METAMASK,
        WALLETCONNECT,
        PRIVATE_KEY
    }

    public class AccountManager : MonoBehaviour
    {
        public event Action ConnectedEvent;
        public event Action<string> ErrorEvent;
        public static AccountManager Instance;
        private IWalletProvider _walletProvider;    
        private SessionKeyWalletProvider _sessionKeyWalletProvider;
       public string SessionPublicKey { get =>  _sessionKeyWalletProvider != null ?  _sessionKeyWalletProvider.Account : "";}
  

        protected void Awake() 
        {
            Instance = this;
            ConnectedEvent +=  OnConnectInternalHandler;
        }
        public event Action DiconnectedEvent;

        public bool IsMetamaskAvailable()
        {
            #if  UNITY_EDITOR
                return false;
            #else
                return MetamaskWalletProvider.IsAvailable();
            #endif           
        }

        public string Account { get => _walletProvider.Account;}
        public bool IsConnected()
        {
            return _walletProvider != null;
        }
        // TODO
        public bool IsWalletConnectAvailable()
        {
            return false;
        }

        public bool IsPrivateKeyConnectAvailable()
        {
            return PrivateKeyWalletProvider.IsAvailable(); 
        }

        public void InitProvider(WalletProviderEnum provider, string privateKey = "") 
        {
            switch (provider)
            {
                case WalletProviderEnum.NONE:
                    break;
                case WalletProviderEnum.METAMASK:
                    var mc = GetComponent<MetamaskWalletProvider>();
                    _walletProvider = mc;
                    break;
                case WalletProviderEnum.WALLETCONNECT:
                    
                    break;
                case WalletProviderEnum.PRIVATE_KEY:
                    var wp = new PrivateKeyWalletProvider
                    {
                        PrivateKey = privateKey
                    };
                    _walletProvider = wp;

                    break;
                default:
                    break;
            }
        }

        public void Connect()
        {
            _walletProvider.Connect(() => ConnectedEvent.Invoke(), (error) => ErrorEvent.Invoke(error));
        }

        public void OnConnectInternalHandler()
        {
           _sessionKeyWalletProvider = new SessionKeyWalletProvider();
           
        }

        public void SignMessage(string message, SignedCallBack signedCallBack, ErrorCallBack errorCallBack)
        {
            if (_walletProvider == null)
            {
                errorCallBack("No Wallet Connected");
                return;
            }
            _walletProvider.SignMessage(message, signedCallBack, errorCallBack);
        }
        public void SignSession(string message, SignedCallBack signedCallBack, ErrorCallBack errorCallBack)
        {
            if (_sessionKeyWalletProvider == null)
            {
                errorCallBack("No Wallet Connected");
                return;
            }
            _sessionKeyWalletProvider.SignMessage(message, signedCallBack, errorCallBack);
        }
    }
}
