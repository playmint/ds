using System.Collections;
using System.Collections.Generic;
using Cinemachine;
using UnityEngine;
using UnityEngine.Rendering.Universal;

public class OutlineController : MonoBehaviour
{
    [SerializeField]
    RenderTexture outlineTexture;

    [SerializeField]
    Camera outlineCam;

    [SerializeField]
    CameraController camController;

    [SerializeField]
    TemplateFeature outlineRenderer;

    [SerializeField]
    UniversalRendererData renderData;

    [SerializeField]
    int farWidth,
        nearWidth;

    int sWidth,
        sHeight;
    int currentZoom = 0;

    float updateTimer = 0;

    private void Awake()
    {
        sWidth = Screen.width;
        sHeight = Screen.height;
        Resize(outlineTexture, sWidth, sHeight);
    }

    private void Update()
    {
        if (updateTimer < 1)
            updateTimer += Time.deltaTime;
        if (updateTimer < 0.1f)
            return;
        if (Screen.width != sWidth || Screen.height != sHeight)
        {
            sWidth = Screen.width;
            sHeight = Screen.height;
            Resize(outlineTexture, sWidth, sHeight);
        }

        int zoom = Mathf.RoundToInt(
            Mathf.Lerp(
                nearWidth,
                farWidth,
                Mathf.InverseLerp(
                    camController.minCameraDistance,
                    camController.maxCameraDistance,
                    camController.virtualCamera
                        .GetCinemachineComponent<CinemachineFramingTransposer>()
                        .m_CameraDistance
                )
            )
        );
        if (zoom != currentZoom)
        {
            outlineRenderer.passSettings.aBlurStrength = zoom;
            renderData.rendererFeatures[0].Create();
        }
    }

    void Resize(RenderTexture renderTexture, int width, int height)
    {
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
