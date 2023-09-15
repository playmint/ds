using System.Collections.Generic;

class EmptyDiorama : IDiorama
{
    public string GetDescription()
    {
        return "No components here, just nothingness";
    }

    public List<Dictionary<string, BaseComponentData>> GetStates()
    {
        return new();
    }
}
