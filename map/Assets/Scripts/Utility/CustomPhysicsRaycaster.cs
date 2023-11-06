using UnityEngine;
using UnityEngine.EventSystems;

public class CustomPhysicsRaycaster : MonoBehaviour
{
    private Camera cam;

    // Object that the pointer is currently over
    private GameObject currentPointerEnter;

    // Object that was clicked
    private GameObject currentPointerDown;

    void Start()
    {
        cam = GetComponent<Camera>();
    }

    void Update()
    {
        // Prepare the raycast
        Ray ray = ScreenToWorld.instance.ScreenToRay(Input.mousePosition);// cam.ScreenPointToRay(Input.mousePosition);
        RaycastHit hit;

        // Perform the raycast
        if (Physics.Raycast(ray, out hit))
        {
            // Process enter and exit events
            GameObject hitObject = hit.collider.gameObject;
            GameObject parentHandler = GetParentWithHandler<IPointerEnterHandler>(hitObject);

            if (currentPointerEnter != parentHandler)
            {
                // Exited the previous object
                ProcessPointerExit(currentPointerEnter);

                // Entered a new object
                currentPointerEnter = parentHandler;
                ProcessPointerEnter(currentPointerEnter);
            }

            // Process click events
            if (Input.GetMouseButtonDown(0))
            {
                currentPointerDown = parentHandler;
            }

            if (Input.GetMouseButtonUp(0) && currentPointerDown == parentHandler)
            {
                ProcessPointerClick(currentPointerDown);
            }
        }
        else if (currentPointerEnter)
        {
            // No hit, and we had an object under the pointer before
            ProcessPointerExit(currentPointerEnter);
            currentPointerEnter = null;

            // Clear click state if needed
            if (Input.GetMouseButtonUp(0))
            {
                currentPointerDown = null;
            }
        }
    }

    private GameObject GetParentWithHandler<T>(GameObject child) where T : IEventSystemHandler
    {
        // Check if the current hit object's parent has the event handler
        // If so, return the parent object instead
        T handler = child.GetComponentInParent<T>();
        return handler != null ? (handler as MonoBehaviour).gameObject : child;
    }

    private void ProcessPointerEnter(GameObject hitObject)
    {
        if (hitObject == null) return;

        // Execute the pointer enter event
        ExecuteEvents.Execute<IPointerEnterHandler>(
            hitObject,
            new PointerEventData(EventSystem.current),
            ExecuteEvents.pointerEnterHandler
        );
    }

    private void ProcessPointerExit(GameObject lastObject)
    {
        if (lastObject == null) return;

        // Execute the pointer exit event
        ExecuteEvents.Execute<IPointerExitHandler>(
            lastObject,
            new PointerEventData(EventSystem.current),
            ExecuteEvents.pointerExitHandler
        );
    }

    private void ProcessPointerClick(GameObject clickedObject)
    {
        if (clickedObject == null) return;

        // Execute the pointer click event
        ExecuteEvents.Execute<IPointerClickHandler>(
            clickedObject,
            new PointerEventData(EventSystem.current),
            ExecuteEvents.pointerClickHandler
        );
    }
}
