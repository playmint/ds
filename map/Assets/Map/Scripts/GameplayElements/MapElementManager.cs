using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Newtonsoft.Json;
using UnityEngine;

public class MapElementManager : MonoBehaviour
{
    public static MapElementManager instance;

    const uint GOO_GREEN = 0;
    const uint GOO_BLUE = 1;
    const uint GOO_RED = 2;

    [SerializeField]
    private GameObject buildingPrefab,
        extractorPrefab,
        bagPrefab,
        enemyPrefab,
        incompleteBuildingPrefab,
        gooGreenPrefab,
        gooBluePrefab,
        gooRedPrefab,
        decorationPrefab;

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

    Dictionary<string, string> totemIDs;

    private void Awake()
    {
        instance = this;
        LoadTotemIDs();
    }

    private void LoadTotemIDs()
    {
        string json = Resources.Load<TextAsset>("totemIDs").text;
        totemIDs = JsonConvert.DeserializeObject<Dictionary<string, string>>(json);
    }

    public string[] GetTotemNamesFromStackCode(string stackCode)
    {
        Regex rx = new Regex(@"\d{2}");
        MatchCollection matches = rx.Matches(stackCode);
        if (
            matches.Count != 2
            || !totemIDs.ContainsKey(matches[0].Value)
            || !totemIDs.ContainsKey(matches[1].Value)
        )
        {
            return null;
        }
        string[] names = new string[2];
        names[0] = totemIDs[matches[0].Value];
        names[1] = totemIDs[matches[1].Value];
        return names;
    }

    public void CreateBuilding(
        Vector3Int cubicCoords,
        Transform tileTransform,
        string id,
        uint category,
        string model
    )
    {
        if (!_spawnedBuildings.ContainsKey(cubicCoords))
        {
            switch (category)
            {
                //categories: 0 = 'none', 1 = 'blocker', 2 = 'extractor', 3 = 'factory', 4 = 'custom'
                case 1:
                    BlockerBuildingController decoration = Instantiate(
                            decorationPrefab,
                            transform,
                            true
                        )
                        .GetComponent<BlockerBuildingController>();
                    _spawnedBuildings.Add(cubicCoords, decoration);
                    decoration.Setup(cubicCoords, tileTransform, id, model);
                    break;
                case 2:
                    ExtractorBuildingController extractor = Instantiate(
                            extractorPrefab,
                            transform,
                            true
                        )
                        .GetComponent<ExtractorBuildingController>();
                    _spawnedBuildings.Add(cubicCoords, extractor);
                    extractor.Setup(cubicCoords, tileTransform, id, model);
                    break;
                default:
                    StackableBuildingController building = Instantiate(
                            buildingPrefab,
                            transform,
                            true
                        )
                        .GetComponent<StackableBuildingController>();
                    _spawnedBuildings.Add(cubicCoords, building);
                    string[] totemNames = GetTotemNamesFromStackCode(model);
                    building.Setup(cubicCoords, tileTransform, id, totemNames);
                    break;
            }
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
        Transform tileTransform,
        bool hasBuilding
    )
    {
        if (!_spawnedGoo.ContainsKey(cubicCoords))
        {
            if (hasBuilding)
                return;

            var atom = atoms.OrderByDescending(atom => atom.Weight).First();
            // Find highest goo val
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

                var gooGO = Instantiate(gooPrefab, tileTransform, false);
                var goo = gooGO.GetComponent<GooController>();
                goo.Setup(atom.Weight >= bigGooThreshold);
                _spawnedGoo.Add(cubicCoords, goo);
            }
        }
        else
        {
            if (hasBuilding)
            {
                _spawnedGoo[cubicCoords].Hide();
            }
            else
            {
                _spawnedGoo[cubicCoords].Show();
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
