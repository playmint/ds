using UnityEngine;

public class BuilderCameraController : BaseComponentController<BuilderCameraData>
{
    private void OnEnable()
    {
        BuilderModeSwitcher.instance.ToggleSceneRendering(false);
    }

    private void OnDestroy()
    {
        BuilderModeSwitcher.instance.ToggleSceneRendering(true);
    }


    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }

        Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
        transform.position = new Vector3(worldPos.x, _nextData.height, worldPos.z);

        _prevData = _nextData;
    }
}
