using System;
using System.Linq;
using Cog;
using UnityEngine;

public class ActionMenuController : MonoBehaviour
{
    private ActionMenuButtonController[] _actionButtons;

    private void Start()
    {
        Cog.GameStateMediator.Instance.EventStateUpdated += OnStateUpdated;

        _actionButtons = GetComponentsInChildren<ActionMenuButtonController>();

        gameObject.SetActive(false);
    }

    private void OnDestroy()
    {
        Cog.GameStateMediator.Instance.EventStateUpdated -= OnStateUpdated;
    }

    private void OnStateUpdated(GameState state)
    {
        if (ShouldShowMenu(state))
        {
            var seekerPos = TileHelper.GetTilePosCube(state.Selected.Seeker.NextLocation);
            gameObject.SetActive(true);
            transform.position = MapManager.instance.grid.CellToWorld(
                GridExtensions.CubeToGrid(seekerPos)
            );
            transform.position = new Vector3(
                transform.position.x,
                MapHeightManager.instance.GetHeightAtPosition(transform.position),
                transform.position.z
            );

            UpdateButtonStates(state);
        }
        else
        {
            gameObject.SetActive(false);
        }
    }

    private bool ShouldShowMenu(GameState state)
    {
        if (IntentManager.Instance.IsHandledIntent(state.Selected.Intent))
        {
            return true;
        }
        else if (state.Selected.Tiles != null && state.Selected.Tiles.Count > 0)
        {
            Debug.Log(state.Selected.Seeker.Id);
            if (state.Selected.Seeker == null || string.IsNullOrEmpty(state.Selected.Seeker.Id))
                return false;
            else
                return true;
            
            var tile = state.Selected.Tiles.ToList()[0];
            var cellPosCube = TileHelper.GetTilePosCube(tile);
            return SeekerManager.instance.IsPlayerAtPosition(cellPosCube);
        }

        return false;
    }

    private void UpdateButtonStates(GameState state)
    {
        if (state.Selected == null)
            return;

        if (state.Selected.Intent == IntentKind.NONE)
        {
            foreach (var btn in _actionButtons)
            {
                btn.Enable();
            }
        }
        else
        {
            foreach (var btn in _actionButtons)
            {
                if (btn.ButtonIntent == state.Selected.Intent)
                {
                    btn.Enable();
                }
                else
                {
                    btn.Disable();
                }
            }
        }
    }
}
