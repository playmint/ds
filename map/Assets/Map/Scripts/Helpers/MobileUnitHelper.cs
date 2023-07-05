using Cog;

public class MobileUnitHelper
{
    public static bool IsPlayerMobileUnit(MobileUnits3 mobileUnit)
    {
        return GameStateMediator.Instance.gameState.Player != null
            && GameStateMediator.Instance.gameState.Player.Id == mobileUnit.Owner.Id;
    }
}
