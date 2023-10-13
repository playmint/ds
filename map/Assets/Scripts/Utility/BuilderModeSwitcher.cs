using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class BuilderModeSwitcher : MonoBehaviour
{
    public static BuilderModeSwitcher instance;
    [SerializeField]
    GameObject[] sceneRenderingObjects;

    private void Awake()
    {
        instance = this;
    }

    public void ToggleSceneRendering(bool switchOn)
    {
        foreach(GameObject obj in sceneRenderingObjects)
        {
            obj.SetActive(switchOn);
        }
    }
}
