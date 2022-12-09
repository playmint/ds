using Nethereum.Signer;
using UnityEngine;

namespace Cog.Account
{
    //Used to sign messages via a genrated sesison key
    public class SessionKeyWalletProvider : IWalletProvider
    {
        public string PrivateKey { get; set; }
        private EthECKey _ethECKey;

        public SessionKeyWalletProvider()
        {
            _ethECKey = EthECKey.GenerateKey();
        }

        public static bool IsAvailable()
        {
            return true;
        }

        public void Connect(ConnectedCallBack connectedCallBack, ErrorCallBack errorCallBack)
        {
            connectedCallBack();
        }

        public void SignMessage(
            string message,
            SignedCallBack signedCallBack,
            ErrorCallBack errorCallBack
        )
        {
            var signer1 = new EthereumMessageSigner();
            var signature1 = signer1.EncodeUTF8AndSign(message, _ethECKey);
            signedCallBack(signature1);
        }

        public string Account
        {
            get => _ethECKey.GetPublicAddress();
        }
    }
}
