using System.Collections;
using UnityEngine;
using Nethereum.Unity.Metamask;
using Nethereum.Hex.HexTypes;
using Nethereum.Unity.Rpc;
using System.Numerics;
using System;

namespace Cog.Account
{
    public class MetamaskWalletProvider : MonoBehaviour, IWalletProvider
    {
        private ConnectedCallBack _connectedCallBack;
        private ErrorCallBack _errorCallBack;
        private string _selectedAccountAddress;
        private bool _isMetamaskInitialised= false;
        private BigInteger _currentChainId;
        public string Account { get => _selectedAccountAddress;}
        public static bool IsAvailable() 
        {
            return MetamaskInterop.IsMetamaskAvailable();
        }
        public void Connect(ConnectedCallBack connectedCallBack, ErrorCallBack errorCallBack)
        {
            _connectedCallBack = connectedCallBack;
            _errorCallBack = errorCallBack;
            if (MetamaskInterop.IsMetamaskAvailable())
            {
                MetamaskInterop.EnableEthereum(gameObject.name, nameof(EthereumEnabled), nameof(DisplayError));
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
        public void EthereumEnabled(string addressSelected)
        {
            if (!_isMetamaskInitialised)
            {
                MetamaskInterop.EthereumInit(gameObject.name, nameof(NewAccountSelected), nameof(ChainChanged));
                MetamaskInterop.GetChainId(gameObject.name, nameof(ChainChanged), nameof(DisplayError));
                _isMetamaskInitialised = true;
            }
            NewAccountSelected(addressSelected);
            _connectedCallBack();
        }

        public void ChainChanged(string chainId)
        {
            print(chainId);
            _currentChainId = new HexBigInteger(chainId).Value;
            try
            {
                //simple workaround to show suported configured chains
                print(_currentChainId.ToString());
                StartCoroutine(GetBlockNumber());
            }
            catch(Exception ex)
            {
                DisplayError(ex.Message);
            }
        }

        public void NewAccountSelected(string accountAddress)
        {
            _selectedAccountAddress = accountAddress;
        }
        public void SignMessage(string message, SignedCallBack signedCallBack, ErrorCallBack errorCallBack)
        {
            StartCoroutine(PersonalSignUnityRequest(message, signedCallBack, errorCallBack));
        }

        private  IEnumerator PersonalSignUnityRequest(string message, SignedCallBack signedCallBack, ErrorCallBack errorCallBack)
        {
            HexUTF8String data = new HexUTF8String(message);
            var signRequest = new EthPersonalSignUnityRequest(GetUnityRpcRequestClientFactory());
            yield return signRequest.SendRequest(data);
            signedCallBack (signRequest.Result);
            print(signRequest.Result);
        }

        private IEnumerator GetBlockNumber()
        {
            var blockNumberRequest = new EthBlockNumberUnityRequest(GetUnityRpcRequestClientFactory());
            yield return blockNumberRequest.SendRequest();
            print(blockNumberRequest.Result.Value);
        }

        public IUnityRpcRequestClientFactory GetUnityRpcRequestClientFactory()
        {
            if (MetamaskInterop.IsMetamaskAvailable())
            {
                return new MetamaskRequestRpcClientFactory(_selectedAccountAddress, null, 1000);
            }
            else
            {
                DisplayError("Metamask is not available, please install it");
                return null;
            }
        }
    }
}
