using System.Collections;
using System.Collections.Generic;
using Cinemachine;
using UnityEngine;
using UnityEngine.Rendering.PostProcessing;

public class CameraController : MonoBehaviour
{
    [HideInInspector]
    public bool hasDragged = false;

    public float moveSpeed;

    [SerializeField]
    public CinemachineVirtualCamera virtualCamera;

    [SerializeField]
    private Transform target;

    [SerializeField]
    private float zoomSpeed = 5f;

    [SerializeField]
    public float minCameraDistance = 5f;

    [SerializeField]
    public float maxCameraDistance = 20f;

    [SerializeField]
    private float zoomDuration = 0.2f;

    [SerializeField]
    PostProcessVolume PPVolume;

    [SerializeField]
    float minAOIntensity,
        maxAOIntensity;

    private Camera mainCamera;
    private Coroutine zoomCoroutine;

    Plane m_Plane;

    private Vector3 mouseDownPos;
    private Vector3 camMouseDownPos;
    private float _dragThreshold = 0.1f;

    void Start()
    {
        mainCamera = Camera.main;
        m_Plane = new Plane(Vector3.up, -0.3f);
    }

    void Update()
    {
        float scrollInput = Input.GetAxis("Mouse ScrollWheel");

        if (Mathf.Abs(scrollInput) > Mathf.Epsilon)
        {
            // Get the world position of the mouse cursor
            Ray ray = mainCamera.ScreenPointToRay(Input.mousePosition);
            //RaycastHit hit;
            float enter = 0;
            if (m_Plane.Raycast(ray, out enter)) //  Physics.Raycast(ray, out hit))
            {
                Vector3 mouseWorldPos = ray.origin + (ray.direction * enter); // hit.point;

                // Calculate the new camera distance based on the scroll input
                float currentCameraDistance = virtualCamera
                    .GetCinemachineComponent<CinemachineFramingTransposer>()
                    .m_CameraDistance; //.CameraDistance;
                float newCameraDistance = currentCameraDistance - scrollInput * zoomSpeed;
                newCameraDistance = Mathf.Clamp(
                    newCameraDistance,
                    minCameraDistance,
                    maxCameraDistance
                );

                // Calculate the zoom factor based on the camera's current and new distances
                float zoomFactor = newCameraDistance / currentCameraDistance;

                // Calculate the new target position based on the zoom factor and the direction
                Vector3 newTargetPos =
                    (1 - zoomFactor) * mouseWorldPos + zoomFactor * target.position;

                // Smoothly interpolate the camera distance and target position
                if (zoomCoroutine != null)
                {
                    StopCoroutine(zoomCoroutine);
                }
                zoomCoroutine = StartCoroutine(
                    SmoothZoom(
                        currentCameraDistance,
                        newCameraDistance,
                        target.position,
                        newTargetPos,
                        zoomDuration
                    )
                );
            }
        }
        PPVolume.sharedProfile.GetSetting<AmbientOcclusion>().intensity.value = Mathf.Lerp(
            minAOIntensity,
            maxAOIntensity,
            Mathf.InverseLerp(
                minCameraDistance,
                maxCameraDistance,
                virtualCamera
                    .GetCinemachineComponent<CinemachineFramingTransposer>()
                    .m_CameraDistance
            )
        );
        HandleMouseCameraDrag();
        float speed = moveSpeed * Mathf.Abs(mainCamera.transform.position.y);
        Vector3 inputVector =
            new Vector3(Input.GetAxis("Horizontal"), 0, Input.GetAxis("Vertical"))
            * speed
            * Time.deltaTime;
        target.position += inputVector;
    }

    private IEnumerator SmoothZoom(
        float startDistance,
        float endDistance,
        Vector3 startPosition,
        Vector3 endPosition,
        float duration
    )
    {
        float elapsedTime = 0;

        while (elapsedTime < duration)
        {
            elapsedTime += Time.deltaTime;

            float t = elapsedTime / duration;
            t = Mathf.Sin(t * Mathf.PI * 0.5f); // Ease-out effect

            // Update the Cinemachine Virtual Camera's Follow offset and target position
            virtualCamera
                .GetCinemachineComponent<CinemachineFramingTransposer>()
                .m_CameraDistance = Mathf.Lerp(startDistance, endDistance, t);
            target.position = Vector3.Lerp(startPosition, endPosition, t);

            yield return null;
        }

        // Ensure the final values are set
        virtualCamera.GetCinemachineComponent<CinemachineFramingTransposer>().m_CameraDistance =
            endDistance;
        target.position = endPosition;
    }

    void HandleMouseCameraDrag()
    {
        if (Input.GetMouseButtonDown(0))
        {
            mouseDownPos = Input.mousePosition;
            camMouseDownPos = transform.position;
            hasDragged = false;
        }
        if (Input.GetMouseButton(0))
        {
            Ray mouseDownRay = Camera.main.ScreenPointToRay(mouseDownPos);
            Ray currentMouseRay = Camera.main.ScreenPointToRay(Input.mousePosition);
            float mouseDownDist = 0.0f;
            float currentMouseDist = 0.0f;
            m_Plane.Raycast(mouseDownRay, out mouseDownDist);
            m_Plane.Raycast(currentMouseRay, out currentMouseDist);

            Vector3 offset = (
                mouseDownRay.GetPoint(mouseDownDist) - currentMouseRay.GetPoint(currentMouseDist)
            );
            transform.position = camMouseDownPos + offset;
            if (Vector3.Distance(camMouseDownPos, camMouseDownPos + offset) > _dragThreshold)
            {
                hasDragged = true;
            }
        }
    }

    // public void FocusTile(Vector3Int cubePos)
    // {
    //     target.position = MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cubePos));
    // }
}
