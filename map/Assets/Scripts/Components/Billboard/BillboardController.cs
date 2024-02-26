using System.Collections;
using System.Runtime.InteropServices;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.Networking;

public class BillboardController : BaseComponentController<BillboardData>
{
    [SerializeField]
    protected Renderer[] outlineObjs;

    [SerializeField]
    protected Renderer[] renderers;

    [SerializeField]
    protected Color highlightColor;

    [SerializeField]
    private Renderer billboardRenderer;

    public Material redOutlineMat,
        greenOutlineMat;

    private Color _defaultColor;
    private string currentURL;

    protected void Start()
    {
        _defaultColor = renderers[0].material.GetColor("_EmissionColor");
    }

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }

        // position
        Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
        transform.position = new Vector3(worldPos.x, _nextData.height, worldPos.z);
        transform.GetChild(0).localEulerAngles = new Vector3(0, _nextData.rotation, 0);
        // selected
        if (_nextData.selected == "outline")
        {
            foreach (Renderer outlineObj in outlineObjs)
            {
                outlineObj.material = redOutlineMat;
            }
            foreach (Renderer rend in renderers)
            {
                rend.material.SetColor("_EmissionColor", _defaultColor);
            }
        }
        else if (_nextData.selected == "highlight")
        {
            foreach (Renderer outlineObj in outlineObjs)
            {
                outlineObj.material = greenOutlineMat;
            }
            foreach (Renderer rend in renderers)
            {
                rend.material.SetColor("_EmissionColor", highlightColor);
            }
        }
        else
        {
            foreach (Renderer outlineObj in outlineObjs)
            {
                outlineObj.material = greenOutlineMat;
            }
            foreach (Renderer rend in renderers)
            {
                rend.material.SetColor("_EmissionColor", _defaultColor);
            }
        }

        if (_nextData.url != null && _nextData.url != currentURL)
        {
            StartCoroutine(
                FetchTexture(
                    _nextData.url,
                    (texture) =>
                    {
                        if (texture != null)
                        {
                            billboardRenderer.material.mainTexture = texture;
                            FitTextureToTransform(texture, billboardRenderer.transform);
                        }
                        else
                        {
                            Debug.Log("Failed to load texture.");
                        }
                    }
                )
            );
            currentURL = _nextData.url;
        }

        _prevData = _nextData;
    }

    public IEnumerator FetchTexture(string url, System.Action<Texture2D> onTextureLoaded)
    {
        using (UnityWebRequest uwr = UnityWebRequestTexture.GetTexture(url))
        {
            yield return uwr.SendWebRequest();

            if (
                uwr.result == UnityWebRequest.Result.ConnectionError
                || uwr.result == UnityWebRequest.Result.ProtocolError
            )
            {
                Debug.LogError(uwr.error);
                onTextureLoaded?.Invoke(null);
            }
            else
            {
                // Get downloaded asset bundle
                Texture2D texture = DownloadHandlerTexture.GetContent(uwr);
                onTextureLoaded?.Invoke(texture);
            }
        }
    }

    void FitTextureToTransform(Texture2D texture, Transform transform)
    {
        float textureAspectRatio = (float)texture.width / (float)texture.height;
        Vector3 originalScale = transform.localScale;
        float originalAspectRatio = originalScale.x / originalScale.y;

        // Calculate new scale factors, maintaining the original aspect ratio
        float scaleFactor;
        if (textureAspectRatio > originalAspectRatio)
        {
            scaleFactor = originalScale.x / texture.width;
        }
        else
        {
            scaleFactor = originalScale.y / texture.height;
        }

        // Calculate new scale, ensuring it does not exceed the original size
        Vector3 newScale = new Vector3(
            texture.width * scaleFactor,
            texture.height * scaleFactor,
            originalScale.z
        );

        // Apply the new scale to the transform
        transform.localScale = new Vector3(
            Mathf.Min(newScale.x, originalScale.x),
            Mathf.Min(newScale.y, originalScale.y),
            originalScale.z
        );
    }
}
