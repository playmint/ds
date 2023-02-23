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
    private float prevDirection = -100;
    private Vector3 prevMousePosition;
    private Vector3 mouseDownPos;
    private Vector3 camMouseDownPos;

    void Start()
    {
        cam = GetComponent<Camera>();
        m_Plane = new Plane(Vector3.forward, 0);
        Debug.Log("Version 1");
    }

    void Update()
    {
        Zoom();
    }

    void Zoom()
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);
        float enter = 0.0f;
        float speed = moveSpeed * Mathf.Abs(transform.position.z);
        if (m_Plane.Raycast(ray, out enter))
        {
            Vector3 mousePosition = ray.GetPoint(enter);

            if (Input.GetMouseButtonDown(0))
            {
                mouseDownPos = mousePosition;
                camMouseDownPos = transform.position;
            }
            Vector3 dragVector = Vector3.zero;
            if (Input.GetMouseButton(0))
            {
                dragVector = (prevMousePosition - mousePosition);
                transform.position = camMouseDownPos + dragVector;
                Debug.Log(dragVector);
            }

            float z = Input.mouseScrollDelta.y;
            float direction = 0;
            if (z > 0)
                direction = 1;
            else if (z < 0)
                direction = -1;



            if (direction != prevDirection) {
                Debug.Log("scroll wheel delta: " + z + ", has focus: " + Application.isFocused.ToString());
                
                prevDirection = direction;
             }

            float step = zoomSpeed * Time.deltaTime * prevDirection;
            Vector3 inputVector = new Vector3(Input.GetAxis("Horizontal"), Input.GetAxis("Vertical"), 0) * speed * Time.deltaTime;
           
            
            
            Vector3 movementOffset = inputVector;
            Vector3 zoomOffset = (Vector3.Normalize(mousePosition - transform.position) * step);
            transform.position += zoomOffset + movementOffset ;
            if (transform.position.z > minZoom || transform.position.z < maxZoom)
                transform.position -= zoomOffset;

            prevMousePosition = mousePosition;
        }
    }
}
