using UnityEngine;

public class GeneratorBuildingController : BaseComponentController<GeneratorBuildingData>
{
    [SerializeField]
    protected GameObject zap;

    [SerializeField]
    private GameObject explosionFX;

    float spawnTimer = 0;

    protected void Update()
    {
        if (spawnTimer < 1)
            spawnTimer += Time.deltaTime;
        if (_prevData == _nextData)
        {
            return;
        }
        Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
        transform.position = new Vector3(worldPos.x, _nextData.height, worldPos.z);
        transform.GetChild(0).localEulerAngles = new Vector3(0, _nextData.rotation, 0);

        zap.SetActive(_nextData.powered);

        _prevData = _nextData;
    }

    private void OnDestroy()
    {
        if (spawnTimer >= 1)
            Instantiate(explosionFX, transform.position, Quaternion.identity);
    }
}
