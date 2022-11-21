using Nethereum.Signer;
using UnityEngine;

namespace Cog.Account
{
    //Used to sign messages within the editor using a provided private key 
    //Only to be used for Development and Non Release workflows
    public class PrivateKeyWalletProvider : IWalletProvider
    {
        public string PrivateKey { get; set; }
        private EthECKey _ethECKey;
        public static bool IsAvailable()
        {
        #if  UNITY_EDITOR
            return true;
        #else
            return false;
        #endif
        }
        public void Connect(ConnectedCallBack connectedCallBack, ErrorCallBack errorCallBack)
        {
            if (PrivateKey != "")
            {
                _ethECKey = new EthECKey(PrivateKey);
                connectedCallBack();
            }
            else
            {
                errorCallBack ("No Private Key Provided");
            }
        }

        public void SignMessage(string message, SignedCallBack signedCallBack, ErrorCallBack errorCallBack)
        {
            var signer1 = new EthereumMessageSigner();
            var signature1 = signer1.EncodeUTF8AndSign(message,_ethECKey);
            signedCallBack(signature1);
        }

         public string Account { get => _ethECKey.GetPublicAddress ();}

    }
}
