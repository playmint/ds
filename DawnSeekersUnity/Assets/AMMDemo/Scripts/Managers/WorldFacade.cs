using System;
using UnityEngine;

namespace AMMDemo.Scripts.Managers
{
    public class WorldFacade : MonoBehaviour
    {
        public static WorldFacade Instance { get; private set; }
        public StateManager StateManager { get; private set; }

        private void Start()
        {
            Instance = this;
            StateManager = new StateManager();
        }
    }
}