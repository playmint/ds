using System.Collections;
using System.Collections.Generic;
using Cinemachine;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public class CameraController : MonoBehaviour
{
    public static bool hasDragged = false;

    public float moveSpeed;

    [SerializeField]
    public CinemachineVirtualCamera? virtualCamera;

    [SerializeField]
    private Transform? target;

    [SerializeField]
    private float zoomSpeed = 5f;

    [SerializeField]
    public float minCameraDistance = 5f;

    [SerializeField]
    public float maxCameraDistance = 20f;

    [SerializeField]
    private float zoomDuration = 0.2f;

    public Camera? mainCamera;
    private Coroutine? zoomCoroutine;

    Plane m_Plane;

    private Vector3 mouseDownPos;
    private Vector3 camMouseDownPos;
    private float _dragThreshold = 0.1f;
    private float buttonScrollSpeed = 10;

    void Start()
    {
        m_Plane = new Plane(Vector3.up, -0.3f);
    }

    void Update()
    {
        if (mainCamera == null)
        {
            return;
        }
        if (virtualCamera == null)
        {
            return;
        }
        if (target == null)
        {
            return;
        }
        float buttonScroll = 0;
        if (Input.GetKey(KeyCode.Q))
            buttonScroll += 1 * Time.deltaTime * buttonScrollSpeed;
        if (Input.GetKey(KeyCode.E))
            buttonScroll -= 1 * Time.deltaTime * buttonScrollSpeed;
        float scrollInput = Input.GetAxis("Mouse ScrollWheel") + buttonScroll;

        if (Mathf.Abs(scrollInput) > Mathf.Epsilon)
        {
            // Get the world position of the mouse cursor
            Ray ray = ScreenToWorld.instance.ScreenToRay(Input.mousePosition);
            float enter = 0;
            if (m_Plane.Raycast(ray, out enter))
            {
                Vector3 mouseWorldPos = ray.origin + (ray.direction * enter);

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
        if (virtualCamera == null)
        {
            yield break;
        }
        if (target == null)
        {
            yield break;
        }
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
            Ray mouseDownRay = ScreenToWorld.instance.ScreenToRay(mouseDownPos);
            Ray currentMouseRay = ScreenToWorld.instance.ScreenToRay(Input.mousePosition);
            float mouseDownDist = 0.0f;
            float currentMouseDist = 0.0f;
            m_Plane.Raycast(mouseDownRay, out mouseDownDist);
            m_Plane.Raycast(currentMouseRay, out currentMouseDist);

            Vector3 offset = (
                mouseDownRay.GetPoint(mouseDownDist) - currentMouseRay.GetPoint(currentMouseDist)
            );
            transform.position = (camMouseDownPos + offset);
            if (Vector3.Distance(camMouseDownPos, camMouseDownPos + offset) > _dragThreshold)
            {
                hasDragged = true;
            }
        }
    }

    public void FocusTile(Vector3 worldPos)
    {
        if (target == null)
        {
            return;
        }
        target.position = worldPos;
    }
}
