using System.Runtime.InteropServices;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.EventSystems;

public class TileGooController : BaseComponentController<TileGooData>
{
    [SerializeField]
    private GameObject _gooGreen;

    [SerializeField]
    private GameObject _gooBlue;

    [SerializeField]
    private GameObject _gooRed;

    private GameObject _gooInstance;

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

        // Display the correct colour
        // TODO: Implement a generic white sprite that can be coloured
        if (_gooInstance != null)
        {
            Destroy(_gooInstance);
        }

        // disabled
        /*


        switch (_nextData.color)
        {
            case "red":
                _gooInstance = Instantiate(_gooRed, transform, false);
                break;
            case "green":
                _gooInstance = Instantiate(_gooGreen, transform, false);
                break;
            case "blue":
                _gooInstance = Instantiate(_gooBlue, transform, false);
                break;
            default:
                // No goo for specified colour
                return;
        }

        _gooInstance.transform.Rotate(0, Random.Range(0, 12) * 30.0f, 0);

        // Display the correct size
        var smallGoo = _gooInstance.transform.Find("small");
        if (smallGoo != null)
        {
            smallGoo.gameObject.SetActive(_nextData.size == "small");
        }

        var bigGoo = _gooInstance.transform.Find("big");
        if (bigGoo != null)
        {
            bigGoo.gameObject.SetActive(_nextData.size == "big");
        }
        */
    }
}
