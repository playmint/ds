using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.AddressableAssets;

public class EnvironmentLoaderManager : MonoBehaviour
{
    public static System.Action EnvironmentAssetsLoaded;
    public static EnvironmentLoaderManager instance;

    [SerializeField]
    AssetLabelReference environmentAssetsLabel;

    [SerializeField]
    bool loadDynamic;

    [SerializeField]
    GameObject selectionPrefab;

    private Task loadAssets;

    private GameObject _tilePrefab;
    private GameObject _selectionPrefab;

    private void Awake()
    {
#if !UNITY_EDITOR && UNITY_WEBGL
        // disable WebGLInput.captureAllKeyboardInput so elements in web page can handle keyboard inputs
        WebGLInput.captureAllKeyboardInput = false;
#endif
        if (instance == null)
        {
            instance = this;
        }
        else
        {
            Destroy(gameObject);
        }
        //Addressables.InitializeAsync();

        // force ready
    }

    async void Start()
    {
            await MapManager.instance.ready;
            await HighlightManager.instance.ready;
            await MobileUnitManager.instance.ready;
            EnvironmentAssetsLoaded?.Invoke();
    }

    /* async void Caller() */
    /* { */
    /*     loadAssets = LoadAssetsAsync(environmentAssetsLabel); */
    /*     await loadAssets; */
    /* } */

    /* async Task LoadAssetsAsync(AssetLabelReference label) */
    /* { */
    /*     Debug.Log("Loading environment assets..."); */
    /*     AsyncOperationHandle operationHandle = Addressables.LoadAssetAsync<GameObject>(label); */
    /*     await operationHandle.Task; */
    /*     _tilePrefab = (GameObject)operationHandle.Result; */
    /*     Invoke("DelayedInvoke", 1); */
    /* } */

    /* private void DelayedInvoke() */
    /* { */
    /*     EnvironmentAssetsLoaded?.Invoke(); */
    /*     Debug.Log("Environment assets loaded."); */
    /* } */
}
