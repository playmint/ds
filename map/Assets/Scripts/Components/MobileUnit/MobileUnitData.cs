public class MobileUnitData : BaseComponentData
{
    public int q;
    public int r;
    public int s;
    public float height;
    public float progress; // 0 -> 1 percent between prev/next
    public string? selected; // ={none/highlight/outline}
    public bool shared; //  ie sharing with a building
    public bool visible;
}
