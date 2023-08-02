using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public class MapElementManager : MonoBehaviour
{
    public static MapElementManager instance;

    const uint GOO_GREEN = 0;
    const uint GOO_BLUE = 1;
    const uint GOO_RED = 2;

    [SerializeField]
    private GameObject buildingPrefab,
        bagPrefab,
        enemyPrefab,
        incompleteBuildingPrefab,
        gooGreenPrefab,
        gooBluePrefab,
        gooRedPrefab;

    [SerializeField]
    private uint smallGooThreshold,
        bigGooThreshold;
    private Dictionary<Vector3Int, MapElementController> _spawnedBuildings =
        new Dictionary<Vector3Int, MapElementController>();
    private Dictionary<Vector3Int, MapElementController> _spawnedIncompleteBuildings =
        new Dictionary<Vector3Int, MapElementController>();
    private Dictionary<Vector3Int, MapElementController> _spawnedEnemies =
        new Dictionary<Vector3Int, MapElementController>();
    private Dictionary<Vector3Int, MapElementController> _spawnedBags =
        new Dictionary<Vector3Int, MapElementController>();
    private Dictionary<Vector3Int, GooController> _spawnedGoo =
        new Dictionary<Vector3Int, GooController>();

    private void Awake()
    {
        instance = this;
    }

    public void CreateBuilding(Vector3Int cubicCoords, Transform tileTransform, string id)
    {
        if (!_spawnedBuildings.ContainsKey(cubicCoords))
        {
            MapElementController building = Instantiate(buildingPrefab, transform, true)
                .GetComponent<MapElementController>();
            _spawnedBuildings.Add(cubicCoords, building);
            building.Setup(cubicCoords, tileTransform, id);
        }
    }

    public void CreateIncompleteBuilding(Vector3Int cubicCoords, Transform tileTransform, string id)
    {
        if (!_spawnedIncompleteBuildings.ContainsKey(cubicCoords))
        {
            MapElementController building = Instantiate(incompleteBuildingPrefab, transform, true)
                .GetComponent<MapElementController>();
            _spawnedIncompleteBuildings.Add(cubicCoords, building);
            building.Setup(cubicCoords, tileTransform, id);
        }
    }

    public void CreateEnemy(Vector3Int cubicCoords, Transform tileTransform, string id)
    {
        if (!_spawnedEnemies.ContainsKey(cubicCoords))
        {
            MapElementController enemy = Instantiate(enemyPrefab, transform, true)
                .GetComponent<MapElementController>();
            _spawnedEnemies.Add(cubicCoords, enemy);
            enemy.Setup(cubicCoords, tileTransform, id);
        }
    }

    public void CreateBag(Vector3Int cubicCoords, Transform tileTransform, string id)
    {
        if (!_spawnedBags.ContainsKey(cubicCoords))
        {
            MapElementController bag = Instantiate(bagPrefab, transform, true)
                .GetComponent<MapElementController>();
            _spawnedBags.Add(cubicCoords, bag);
            bag.Setup(cubicCoords, tileTransform, id);
        }
    }

    public void CreateGoo(
        ICollection<Cog.Atoms2> atoms,
        Vector3Int cubicCoords,
        Transform tileTransform
    )
    {
        if (!_spawnedGoo.ContainsKey(cubicCoords))
        {
            // Find highest goo val
            var atom = atoms.OrderByDescending(atom => atom.Weight).First();
            if (atom.Weight >= smallGooThreshold)
            {
                GameObject gooPrefab;
                switch (atom.Key)
                {
                    case GOO_BLUE:
                        gooPrefab = gooBluePrefab;
                        break;
                    case GOO_GREEN:
                        gooPrefab = gooGreenPrefab;
                        break;
                    case GOO_RED:
                        gooPrefab = gooRedPrefab;
                        break;

                    default:
                        // No Goo with this key
                        return;
                }

                Debug.Log($"Atom {atom.Key}: weight: {atom.Weight}");

                var gooGO = Instantiate(gooPrefab, tileTransform, false);
                var goo = gooGO.GetComponent<GooController>();
                goo.Setup(atom.Weight >= bigGooThreshold);
                _spawnedGoo.Add(cubicCoords, goo);
            }
        }
    }

    public int IsElementAtCell(Vector3Int cubicCoords)
    {
        if (
            IsBuildingAtCell(cubicCoords) == 1
            || _spawnedIncompleteBuildings.ContainsKey(cubicCoords)
        )
            return 1;
        else
            return 0;
    }

    public int IsBuildingAtCell(Vector3Int cubicCoords)
    {
        if (_spawnedBuildings.ContainsKey(cubicCoords) || _spawnedEnemies.ContainsKey(cubicCoords))
            return 1;
        else
            return 0;
    }

    public void CheckBagIconRemoved(Vector3Int cubicCoords)
    {
        if (_spawnedBags.ContainsKey(cubicCoords))
        {
            _spawnedBags[cubicCoords].GetComponent<MapElementController>().DestroyMapElement();
            _spawnedBags.Remove(cubicCoords);
        }
    }

    public void CheckBuildingIconRemoved(Vector3Int cubicCoords)
    {
        if (_spawnedBuildings.ContainsKey(cubicCoords))
        {
            _spawnedBuildings[cubicCoords].GetComponent<MapElementController>().DestroyMapElement();
            _spawnedBuildings.Remove(cubicCoords);
        }
    }

    public void CheckEnemyIconRemoved(Vector3Int cubicCoords)
    {
        if (_spawnedEnemies.ContainsKey(cubicCoords))
        {
            _spawnedEnemies[cubicCoords].GetComponent<MapElementController>().DestroyMapElement();
            _spawnedEnemies.Remove(cubicCoords);
        }
    }

    public void CheckIncompleteBuildingIconRemoved(Vector3Int cubicCoords)
    {
        if (_spawnedIncompleteBuildings.ContainsKey(cubicCoords))
        {
            _spawnedIncompleteBuildings[cubicCoords]
                .GetComponent<MapElementController>()
                .DestroyMapElement();
            _spawnedIncompleteBuildings.Remove(cubicCoords);
        }
    }

    public IconController CreateIcon(Transform iconParent, GameObject iconPrefab)
    {
        IconController icon;
        icon = Instantiate(iconPrefab, transform, true).GetComponent<IconController>();
        icon.Setup(iconParent);
        return icon;
    }

    public static Vector3 GetPositionOnCircle(float radius, int numObjects, int index)
    {
        float angle = (float)index / numObjects * 360f;
        angle += 240;
        float x = radius * Mathf.Sin(angle * Mathf.Deg2Rad);
        float z = radius * Mathf.Cos(angle * Mathf.Deg2Rad);
        float y = 0;
        return new Vector3(x, y, z);
    }

    public bool HasBuilding(Vector3Int tilePosCube)
    {
        return _spawnedBuildings.ContainsKey(tilePosCube);
    }

    public bool HasEnemy(Vector3Int tilePosCube)
    {
        return _spawnedEnemies.ContainsKey(tilePosCube);
    }
}
