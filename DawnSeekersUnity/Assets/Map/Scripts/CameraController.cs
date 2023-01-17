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
    public Camera camera;
    public float perspectiveRotation = -30f;
    private Matrix4x4 startMatrix;
    private Matrix4x4 endMatrix;
    private Quaternion startRotation;
    private Quaternion endRotation;

    bool isOrtho = true;

    public void SwitchToPerspective()
    {
        
        isOrtho = false;
        startRotation = camera.transform.rotation;
        endRotation = Quaternion.Euler(perspectiveRotation, 0, 0);
        StartCoroutine(Transition(Matrix4x4.Perspective(60, camera.aspect, 0.3f, 1000f)));
    }

    public void SwitchToOriginal()
    {
        isOrtho = true;
        
        startRotation = camera.transform.rotation;
        endRotation = Quaternion.identity;
        StartCoroutine(Transition(startMatrix));
    }

    private IEnumerator Transition(Matrix4x4 endMatrix)
    {
        Vector3 startPos = camera.transform.position;
        Quaternion startRot = camera.transform.rotation;
        Vector3 rotPoint = GetPlanePoint(new Vector3(Screen.width / 2, Screen.height / 2, 0));
        if(!isOrtho)
            camera.transform.RotateAround(rotPoint, Vector3.right, perspectiveRotation);
        else
            camera.transform.RotateAround(rotPoint, Vector3.right, -perspectiveRotation);
        Vector3 endpos = camera.transform.position;
        Quaternion endRot = camera.transform.rotation;
        camera.transform.position = startPos;
        camera.transform.rotation = startRot;


       startMatrix = camera.projectionMatrix;
        camera.orthographic = isOrtho;
        float currentLerpTime = 0;
        while (currentLerpTime < transitionDuration)
        {
            currentLerpTime += Time.deltaTime;
            float t = currentLerpTime / transitionDuration;
            camera.projectionMatrix = Lerp(startMatrix, endMatrix, t);
            camera.transform.position = Vector3.Lerp(startPos, endpos,t);
            camera.transform.rotation = Quaternion.Lerp(startRot, endRot, t);
            yield return null;
        }
    }

    Vector3 GetPlanePoint(Vector3 screenPos)
    {
        Ray ray = Camera.main.ScreenPointToRay(screenPos);
        float enter = 0.0f;
        Vector3 point = Vector3.zero;
        if (m_Plane.Raycast(ray, out enter))
        {
            return point = ray.GetPoint(enter);
        }
        return Vector3.zero;
    }


    void Start()
    {
        camera = GetComponent<Camera>();
        startMatrix = camera.projectionMatrix;
        m_Plane = new Plane(Vector3.forward, 0);
    }

    void Update()
    {
        Zoom();
        if (Input.GetKeyDown(KeyCode.Space))
        {
            if (isOrtho)
                SwitchToPerspective();
            else
                SwitchToOriginal();
        }
            //StartCoroutine(RotateCamCR());
    }

    void FocusOnPosition(Vector3 position)
    {

    }

    public static Matrix4x4 Lerp(Matrix4x4 a, Matrix4x4 b, float t)
    {
        t = Mathf.Clamp01(t);
        Matrix4x4 result = new Matrix4x4();
        for (int i = 0; i < 16; i++)
        {
            result[i] = Mathf.Lerp(a[i], b[i], t);
        }
        return result;
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
                transform.position = Vector3.MoveTowards(transform.position, Scrolldirection, Mathf.Clamp(Input.GetAxis("Mouse ScrollWheel"),-1,1) * step);
            }
            if (Input.GetAxis("Mouse ScrollWheel") < 0 && enter < maxZoom)
            {
                transform.position = Vector3.MoveTowards(transform.position, Scrolldirection, Mathf.Clamp(Input.GetAxis("Mouse ScrollWheel"), -1, 1) * step);
            }
            camera.orthographicSize = Mathf.Lerp(1, 5, Mathf.InverseLerp(minZoom, maxZoom, enter));
        }

        //This is here because sometimes zooming glitches out for some reason:
        if (transform.position.z >= 0)
            transform.position -= Vector3.forward;
        if (transform.position.z <-10)
            transform.position = -Vector3.forward*10;

        transform.position += new Vector3(Input.GetAxis("Horizontal"), Input.GetAxis("Vertical"), 0) * Time.deltaTime * moveSpeed;

    }

}
