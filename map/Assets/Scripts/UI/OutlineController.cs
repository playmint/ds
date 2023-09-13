using System;
using Cinemachine;
using UnityEngine;
using UnityEngine.Rendering.Universal;

public class OutlineController : MonoBehaviour
{
    [SerializeField]
    RenderTexture? outlineTexture;

    [SerializeField]
    Camera? outlineCam;

    [SerializeField]
    CameraController? camController;

    [SerializeField]
    TemplateFeature? outlineRenderer;

    [SerializeField]
    UniversalRendererData? renderData;

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

    int sWidth,
        sHeight;
    int currentZoom = 0;

    float updateTimer = 0;

    private CinemachineFramingTransposer? framingTransposer;

    private void Awake()
    {
        if (outlineTexture == null)
        {
            throw new ArgumentException("outlineTexture not set");
        }
        if (camController == null || camController.virtualCamera == null)
        {
            throw new ArgumentException("camController not set");
        }
        sWidth = Screen.width;
        sHeight = Screen.height;
        framingTransposer =
            camController.virtualCamera.GetCinemachineComponent<CinemachineFramingTransposer>();
        Resize(outlineTexture, sWidth, sHeight);
    }

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
        if (outlineTexture == null)
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
        if (Screen.width != sWidth || Screen.height != sHeight)
        {
            sWidth = Screen.width;
            sHeight = Screen.height;
            Resize(outlineTexture, sWidth, sHeight);
            outlineMat.SetFloat("_OutlinePower", falloffMultiplier);
            outlineMat.SetFloat("_OutlinePower2", strokeCutoff);
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

    void Resize(RenderTexture renderTexture, int width, int height)
    {
        if (outlineCam == null)
        {
            throw new ArgumentException("outlineCam not set");
        }
        updateTimer = 0;
        if (renderTexture)
        {
            outlineCam.targetTexture = null;
            Debug.Log("Resize");
            renderTexture.Release();
            renderTexture.width = width;
            renderTexture.height = height;
            renderTexture.Create();
            outlineCam.targetTexture = renderTexture;
        }
    }
}
