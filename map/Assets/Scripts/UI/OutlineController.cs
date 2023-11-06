using System;
using Cinemachine;
using UnityEngine;
using UnityEngine.Rendering.Universal;
using UnityEngine.UI;

public class OutlineController : MonoBehaviour
{
    [SerializeField]
    Camera? mainCamera;

    [SerializeField]
    Camera? outlineCam;

    [SerializeField]
    RawImage screenImage,
        outlineImage;

    [SerializeField]
    CameraController? camController;

    [SerializeField]
    TemplateFeature? outlineRenderer;

    [SerializeField]
    UniversalRendererData? renderData;
    [SerializeField]
    UniversalRenderPipelineAsset renderAsset;

    [SerializeField]
    Material? outlineMat;

    [SerializeField]
    float falloffMultiplier = 8;

    [SerializeField]
    [Range(0, 1)]
    float strokeCutoff = 0.2f;

    [SerializeField]
    int farWidth,
        nearWidth;

    private static bool manualUpdate = false;
    private static float _renderScale = 1;
    public static float renderScale { get { return _renderScale; } set { _renderScale = value; manualUpdate = true; } }

    int sWidth,
        sHeight;
    int currentZoom = 0;

    float updateTimer = 0;
    #if !UNITY_EDITOR || CHECK_RESOLUTION_SCALE
    private RenderTexture _screenTexture;
#endif
    private RenderTexture _outlineTexture;

    private CinemachineFramingTransposer? framingTransposer;

    private void Awake()
    {
        if (outlineCam == null)
        {
            throw new ArgumentException("outlineCam not set");
        }
        if (mainCamera == null)
        {
            throw new ArgumentException("mainCamera not set");
        }
        if (_outlineTexture == null)
        {
            _outlineTexture = new RenderTexture(Screen.width, Screen.height, 0);
            outlineCam.targetTexture = _outlineTexture;
            outlineImage.texture = _outlineTexture;
        }

        if (camController == null || camController.virtualCamera == null)
        {
            throw new ArgumentException("camController not set");
        }
        sWidth = Screen.width;
        sHeight = Screen.height;
        framingTransposer =
            camController.virtualCamera.GetCinemachineComponent<CinemachineFramingTransposer>();
        Resize(_outlineTexture, outlineCam, sWidth, sHeight);

#if !UNITY_EDITOR || CHECK_RESOLUTION_SCALE
        if (_screenTexture == null)
        {
            _screenTexture = new RenderTexture(Screen.width, Screen.height, 0);
            mainCamera.targetTexture = _screenTexture;
            screenImage.texture = _screenTexture;
        }
        Resize(_screenTexture, mainCamera, sWidth, sHeight);
#else
        screenImage.enabled = false;
#endif
    }

#if !UNITY_EDITOR || CHECK_RESOLUTION_SCALE
    protected void Start()
    {
        mainCamera.enabled = false;
        outlineCam.enabled = false;
    }
#endif

    private void OnDestroy()
    {
        _outlineTexture.Release();
    }

#if !UNITY_EDITOR || CHECK_RESOLUTION_SCALE
    private void LateUpdate()
    {
        outlineCam.Render();
        mainCamera.Render();
    }
#endif

    private void Update()
    {
        if (renderData == null)
        {
            throw new ArgumentException("renderData not set");
        }
        if (camController == null)
        {
            throw new ArgumentException("camController not set");
        }
        if (_outlineTexture == null)
        {
            throw new ArgumentException("outlineTexture not set");
        }
        if (outlineMat == null)
        {
            throw new ArgumentException("outlineMat not set");
        }
        if (outlineRenderer == null)
        {
            throw new ArgumentException("outlineRenderer not set");
        }
        if (framingTransposer == null)
        {
            throw new ArgumentException("framingTransposer not set");
        }

        if (updateTimer < 0.2f)
            updateTimer += Time.deltaTime;
        if (updateTimer < 0.1f)
            return;
        if (Screen.width != sWidth || Screen.height != sHeight || manualUpdate)
        {
#if !UNITY_EDITOR || CHECK_RESOLUTION_SCALE
            sWidth = Mathf.CeilToInt(Screen.width * renderScale);
            sHeight = Mathf.CeilToInt(Screen.height * renderScale);
            Resize(_screenTexture, mainCamera, sWidth, sHeight);
#endif

            sWidth = Screen.width;
            sHeight = Screen.height;
            Resize(_outlineTexture, outlineCam, sWidth, sHeight);

            outlineMat.SetFloat("_OutlinePower", falloffMultiplier);
            outlineMat.SetFloat("_OutlinePower2", strokeCutoff);
            manualUpdate = false;
        }

        int zoom = Mathf.RoundToInt(
            Mathf.Lerp(
                nearWidth,
                farWidth,
                Mathf.InverseLerp(
                    camController.minCameraDistance,
                    camController.maxCameraDistance,
                    framingTransposer.m_CameraDistance
                )
            )
        );
        if (zoom != currentZoom)
        {
            outlineRenderer.passSettings.bBlurStrength = zoom;
            renderData.rendererFeatures[0].Create();
            currentZoom = zoom;
        }
    }

    void Resize(RenderTexture renderTexture, Camera cam, int width, int height)
    {
        if (outlineCam == null)
        {
            throw new ArgumentException("outlineCam not set");
        }
        updateTimer = 0;
        if (renderTexture)
        {
            cam.targetTexture = null;
            Debug.Log("Resize");
            renderTexture.Release();
            renderTexture.width = width;
            renderTexture.height = height;
            renderTexture.Create();
            cam.targetTexture = renderTexture;
        }
    }
}
