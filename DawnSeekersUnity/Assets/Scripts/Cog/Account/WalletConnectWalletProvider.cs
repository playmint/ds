using System.Collections;
using UnityEngine;
using Nethereum.Unity.Metamask;
using Nethereum.Hex.HexTypes;
using Nethereum.Unity.Rpc;
using System.Numerics;
using System;

namespace Cog.Account
{
    public class WalletConnectWalletProvider : MonoBehaviour, IWalletProvider
    {
        private ConnectedCallBack _connectedCallBack;
        private ErrorCallBack _errorCallBack;
        private SignedCallBack _signedCallback;
        private string _selectedAccountAddress;

        private BigInteger _currentChainId;
        public string Account
        {
            get => _selectedAccountAddress;
        }

        public static bool IsAvailable()
        {
            return WalletConnectInterop.IsWalletConnectAvailable();
        }

        public void Connect(ConnectedCallBack connectedCallBack, ErrorCallBack errorCallBack)
        {
            _connectedCallBack = connectedCallBack;
            _errorCallBack = errorCallBack;
            if (IsAvailable())
            {
                WalletConnectInterop.ConnectWC(
                    gameObject.name,
                    nameof(WCConnected),
                    nameof(DisplayError)
                );
            }
            else
            {
                errorCallBack("Metamask is not available, please install it");
            }
        }

        public void DisplayError(string error)
        {
            _errorCallBack(error);
        }

        public void WCConnected(string r)
        {
            Debug.Log("EthereumEnabled" + r);
            if (r == "ok")
            {
                _selectedAccountAddress = WalletConnectInterop.WCGetSelectedAddress();
                NewAccountSelected(_selectedAccountAddress);
                _connectedCallBack();
            }
        }

        public void NewAccountSelected(string accountAddress)
        {
            _selectedAccountAddress = accountAddress;
        }

        public void SignMessage(
            string message,
            SignedCallBack signedCallBack,
            ErrorCallBack errorCallBack
        )
        {
            _signedCallback = signedCallBack;
            WalletConnectInterop.SignWC(
                message,
                gameObject.name,
                nameof(WCSignedCallback),
                nameof(DisplayError)
            );
        }

        public void WCSignedCallback(string sig)
        {
            _signedCallback(sig);
        }
    }
}
