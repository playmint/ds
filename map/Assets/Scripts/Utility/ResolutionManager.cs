using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering.Universal;

public class ResolutionManager : MonoBehaviour
{
    [SerializeField]
    UniversalRenderPipelineAsset renderAsset;
    [ContextMenu("Set Resolution Low")]
    public void SetLowResolution()
    {
        SetResoltion("0.1");
    }

    public void SetResoltion(string resolution)
    {
        Debug.Log($"ResolutionManager - SetResolution: {resolution}");
        OutlineController.renderScale = Mathf.Clamp01(float.Parse(resolution));
    }
}
