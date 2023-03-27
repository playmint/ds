using Cog;

public class SeekerHelper
{
    public static bool IsPlayerSeeker(Seekers3 seeker)
    {
        return PluginController.Instance.WorldState.Player.Id
            == seeker.Owner.AdditionalProperties["id"] as string;
    }
}
