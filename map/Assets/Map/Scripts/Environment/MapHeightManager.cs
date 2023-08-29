using UnityEngine;

public class MapHeightManager : MonoBehaviour
{
    public static MapHeightManager instance;
    public const float UNSCOUTED_HEIGHT = -0.17f;

    [SerializeField]
    float heightScale = 1;

    [SerializeField]
    float heightOffset = 0.25f;

    [SerializeField]
    float heightFrequency = 0.25f;

    private void Awake()
    {
        if (instance == null)
        {
            instance = this;
        }
        else
        {
            Destroy(gameObject);
        }
    }

    void Start()
    {
        Random.InitState(1000);
    }

    public float GetHeightAtPosition(Vector3 position)
    {
        return heightOffset
            + (
                Mathf.PerlinNoise(position.x * heightFrequency, position.z * heightFrequency)
                * heightScale
            );
    }

    public Vector3 GetHeightOffsetAtPosition(Vector3 position)
    {
        return Vector3.forward * GetHeightAtPosition(position);
    }
}
