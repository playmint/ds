using AMMDemo.Scripts.Components.ViewModels;
using AMMDemo.Scripts.Managers;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace AMMDemo.Scripts.Components.Views
{
    public class AmmView : MonoBehaviour
    {
        [SerializeField]
        private TextMeshProUGUI _goldBalance;
        
        [SerializeField]
        private TextMeshProUGUI _stoneBalance;
        
        [SerializeField]
        private TextMeshProUGUI _buyPrice;
        
        [SerializeField]
        private TextMeshProUGUI _sellPrice;
        
        [SerializeField]
        private Button _buyButton;
        
        [SerializeField]
        private Button _sellButton;
        
        [SerializeField]
        private TMP_InputField _amountInput;
        
        private AmmViewModel _ammViewModel;

        private void Start()
        {
            _ammViewModel = new AmmViewModel(StateManager.Instance);
        }
    }
}