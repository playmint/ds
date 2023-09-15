public class MobileUnitData : BaseComponentData
{
    public int qNext;
    public int rNext;
    public int sNext;
    public float heightNext;
    public int qPrev;
    public int rPrev;
    public int sPrev;
    public float heightPrev;
    public float progress; // 0 -> 1 percent between prev/next
    public string? selected; // ={none/highlight/outline}
    public bool shared; //  ie sharing with a building
}
