using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ScreenToWorld : MonoBehaviour
{
    public static ScreenToWorld instance;

    [SerializeField]
    Camera cam;

    private void Awake()
    {
        instance = this;
    }

    public Ray ScreenToRay(Vector3 screenPos)
    {
        // Convert the mouse position to normalized device coordinates (NDC)
        screenPos.x = (screenPos.x / Screen.width) * 2f - 1f;
        screenPos.y = (screenPos.y / Screen.height) * 2f - 1f;
        screenPos.z = 0f; // Set to the near clip plane

        // Get the view projection matrix
        Matrix4x4 viewProjectionMatrix = cam.projectionMatrix * cam.worldToCameraMatrix;
        // Invert the view projection matrix
        Matrix4x4 inverseViewProjection = viewProjectionMatrix.inverse;

        // Unproject the NDC to world space at the near clip plane
        Vector3 worldNear = inverseViewProjection.MultiplyPoint(new Vector3(screenPos.x, screenPos.y, -1f));

        // Unproject the NDC to world space at the far clip plane
        Vector3 worldFar = inverseViewProjection.MultiplyPoint(new Vector3(screenPos.x, screenPos.y, 1f));

        // Create the ray
        Vector3 direction = (worldFar - worldNear).normalized;
        return new Ray(worldNear, direction);
    }
}
