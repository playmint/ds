using System;
using GraphQL4Unity;
using UnityEngine;

namespace AMMDemo.Scripts.Managers
{
    [RequireComponent(typeof(GraphQLWebsocket))]
    public class StateManager : MonoBehaviour
    {
        public Action<object> StateUpdated;

        private GraphQLWebsocket _websocket;

        private void Start()
        {
            _websocket = GetComponent<GraphQLWebsocket>();
            _websocket.Url = "ws://localhost:3081/query";
            _websocket.OpenEvent += OnSocketOpened;
            _websocket.CloseEvent += OnSocketClosed;
            _websocket.Connect = true;
        }

        private void OnSocketOpened()
        {
            Debug.Log("Socket opened");

            // subscribe
            
            // fetch initial state
            
            // trigger state updated when new data arrives
        }

        private void OnSocketClosed()
        {
            Debug.Log("Socket closed");
        }

        // trigger state updated when new data arrives
    }
}