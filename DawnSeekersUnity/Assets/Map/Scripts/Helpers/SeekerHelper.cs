using Cog;

public class SeekerHelper
{
    public static bool IsPlayerSeeker(Seekers3 seeker)
    {
        return GameStateMediator.Instance.gameState.Player.Id
            == seeker.Owner.AdditionalProperties["id"] as string;
    }
}
