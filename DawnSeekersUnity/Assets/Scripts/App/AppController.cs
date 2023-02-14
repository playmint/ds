using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.SceneManagement;

namespace Ds.App
{
    public class AppController : MonoBehaviour
    {
        [SerializeField]
        private AssetReference _mapSceme;

        [SerializeField]
        private AssetReference _accountDemo;

        void Start()
        {
#if ACCOUNT_DEMO
            Addressables.LoadSceneAsync(_accountDemo, LoadSceneMode.Additive);
#else
            Addressables.LoadSceneAsync(_mapSceme, LoadSceneMode.Additive);
#endif
        }
    }
}
