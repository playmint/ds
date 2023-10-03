using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class BuildingColorTest : MonoBehaviour
{
    Renderer rend;
    private void Awake()
    {
        rend = GetComponent<Renderer>();
        Color col = new Color();
        col = Color.HSVToRGB(Random.value, 0.7f, 1);
        rend.material.SetColor("_DynamicColor", col);
        col = col * 0.7f;
        rend.material.SetColor("_DynamicShadowColor", col);
    }
}
