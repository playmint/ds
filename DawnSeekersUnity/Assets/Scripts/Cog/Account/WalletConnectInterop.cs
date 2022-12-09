using AOT;
using Nethereum.JsonRpc.Client.RpcMessages;
using Nethereum.Unity.RpcModel;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;

namespace Cog.Account
{
    public class WalletConnectInterop
    {
        [DllImport("__Internal")]
        public static extern void ConnectWC(
            string gameObjectName,
            string callback,
            string fallback
        );

        [DllImport("__Internal")]
        public static extern bool IsWalletConnectAvailable();

        [DllImport("__Internal")]
        public static extern string WCGetSelectedAddress();

        [DllImport("__Internal")]
        public static extern void SignWC(
            string message,
            string gameObjectName,
            string callback,
            string fallback
        );
    }
}
