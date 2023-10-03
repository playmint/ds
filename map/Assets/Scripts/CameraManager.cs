using System;
using UnityEngine;

[Serializable]
public class CameraTarget
{
    public int q;
    public int r;
    public int s;
}

public class CameraManager : MonoBehaviour
{
    [SerializeField]
    CameraController mainCamera;

    public void FocusTile(string coordsJson)
    {
        var msg = JsonUtility.FromJson<CameraTarget>(coordsJson);
        Vector3Int cubeCoords = new(msg.q, msg.r, msg.s);
        Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
        mainCamera.FocusTile(worldPos);
    }
}
