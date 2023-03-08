using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class CameraController : MonoBehaviour
{
    public float moveSpeed;
    public float zoomSpeed;
    public float minZoom;
    public float maxZoom;

    Plane m_Plane;

    private float prevDirection = -100;
    private Vector3 mouseDownPos;
    private Vector3 camMouseDownPos;

    void Start()
    {
        m_Plane = new Plane(Vector3.forward, 0);
    }

    void Update()
    {
        if (!MapManager.isMakingMove)
            HandleMouseCameraDrag();
        Zoom();
    }

    void HandleMouseCameraDrag()
    {
        if (Input.GetMouseButtonDown(0))
        {
            mouseDownPos = Input.mousePosition;
            camMouseDownPos = transform.position;
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
        }
    }

    void Zoom()
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);

        float enter = 0.0f;
        float speed = moveSpeed * Mathf.Abs(transform.position.z);
        if (m_Plane.Raycast(ray, out enter))
        {
            Vector3 mousePosition = ray.GetPoint(enter);

            float z = Input.mouseScrollDelta.y;
            float direction = 0;
            if (z > 0)
                direction = 1;
            else if (z < 0)
                direction = -1;

            if (direction != prevDirection)
            {
                prevDirection = direction;
            }

            float step = zoomSpeed * Time.deltaTime * prevDirection;
            Vector3 inputVector =
                new Vector3(Input.GetAxis("Horizontal"), Input.GetAxis("Vertical"), 0)
                * speed
                * Time.deltaTime;

            Vector3 movementOffset = inputVector;
            Vector3 zoomOffset = (Vector3.Normalize(mousePosition - transform.position) * step);
            transform.position += zoomOffset + movementOffset;
            if (transform.position.z > minZoom || transform.position.z < maxZoom)
                transform.position -= zoomOffset;
        }
    }
}
