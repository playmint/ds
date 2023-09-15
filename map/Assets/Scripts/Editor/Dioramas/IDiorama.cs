
using System.Collections.Generic;

public interface IDiorama
{
    public string GetDescription();
    public List<Dictionary<string, BaseComponentData>> GetStates();
}
