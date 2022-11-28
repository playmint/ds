using GraphQL4Unity;
using System;
using System.Text;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Runtime.InteropServices;
using UnityEngine;
using Newtonsoft.Json.Linq;
using AOT;

namespace GraphQL4Unity
{
    public class GraphQLWebsocketWebGL : GraphQLWebsocket
    {
        // Start is called before the first frame update
        new void Start()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            _ws = new WebsocketJS();
#else
            _ws = new WebsocketDotNet();
#endif
            _ws.MessageEvent += HandleIncomingMessage;
            _ws.OpenEvent += HandleOpen;
            _ws.CloseEvent += HandleClose;
        }
    }
}