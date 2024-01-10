public class DisplayBuildingData : BaseComponentData
{
    public int q;
    public int r;
    public int s;
    public float height;
    public string? selected; //none/highlight/outline
    public float rotation; // 0 - 360
    public string? color; // 0 - 5
    public string? model; // default, countdown
    public string? labelText; // default, countdown
    public int endTime;
    public float startTime;
}
