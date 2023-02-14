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

    public float transitionDuration = 1f;
    private Camera cam;

    void Start()
    {
        cam = GetComponent<Camera>();
        m_Plane = new Plane(Vector3.forward, 0);
    }

    void Update()
    {
        Zoom();
    }

    void Zoom()
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);
        float enter = 0.0f;

        if (m_Plane.Raycast(ray, out enter))
        {
            Vector3 Scrolldirection = ray.GetPoint(enter);

            float step = zoomSpeed * Time.deltaTime;

            // Allows zooming in and out via the mouse wheel
            if (Input.GetAxis("Mouse ScrollWheel") > 0 && enter > minZoom)
            {
                transform.position = Vector3.MoveTowards(
                    transform.position,
                    Scrolldirection,
                    Mathf.Clamp(Input.GetAxis("Mouse ScrollWheel"), -1, 1) * step
                );
            }
            if (Input.GetAxis("Mouse ScrollWheel") < 0 && enter < maxZoom)
            {
                transform.position = Vector3.MoveTowards(
                    transform.position,
                    Scrolldirection,
                    Mathf.Clamp(Input.GetAxis("Mouse ScrollWheel"), -1, 1) * step
                );
            }
            cam.orthographicSize = Mathf.Lerp(1, 5, Mathf.InverseLerp(minZoom, maxZoom, enter));
        }

        //This is here because sometimes zooming glitches out for some reason:
        if (transform.position.z >= 0)
            transform.position -= Vector3.forward;
        if (transform.position.z < -10)
            transform.position = -Vector3.forward * 10;

        transform.position +=
            new Vector3(Input.GetAxis("Horizontal"), Input.GetAxis("Vertical"), 0)
            * Time.deltaTime
            * moveSpeed;
    }
}
