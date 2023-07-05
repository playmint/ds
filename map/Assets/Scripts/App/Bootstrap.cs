using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.SceneManagement;

namespace Ds.App
{
    public class Bootstrap : MonoBehaviour
    {
        [SerializeField]
        private AssetReference _persistentManagers;

        void Start()
        {
            Addressables.LoadSceneAsync(_persistentManagers, LoadSceneMode.Single);
        }
    }
}
