using Cog;

public class SeekerHelper
{
    public static bool IsPlayerSeeker(Seekers3 seeker)
    {
        return GameStateMediator.Instance.gameState.Player != null
            && GameStateMediator.Instance.gameState.Player.Id == seeker.Owner.Id;
    }
}
