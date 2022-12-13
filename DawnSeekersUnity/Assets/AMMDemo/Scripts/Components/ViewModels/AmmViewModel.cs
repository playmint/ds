using System;
using AMMDemo.Scripts.Managers;
using UnityEngine;

namespace AMMDemo.Scripts.Components.ViewModels
{
    public class AmmViewModel
    {
        public int StoneBalance { get; private set; }
        public int GoldBalance { get; private set; }
        public int BuyPrice { get; private set; }
        public int SellPrice { get; private set; }

        public AmmViewModel(StateManager stateManager)
        {
            stateManager.StateUpdated += UpdateState;
        }

        private void UpdateState(object state)
        {
            Debug.Log("State updated in AMM view model");
        }
    }
}