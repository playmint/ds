public class BaseComponentData
{
    public bool sendScreenPosition;
    public float screenPositionHeightOffset;

    public string GetTypeName()
    {
        return this.GetType().Name;
    }
}
