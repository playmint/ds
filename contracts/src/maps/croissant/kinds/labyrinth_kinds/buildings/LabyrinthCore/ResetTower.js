import ds from "downstream";

export default async function update(state) {
    const selectedTile = getSelectedTile(state);
    const selectedBuilding =
        selectedTile && getBuildingOnTile(state, selectedTile);

    const reset = (values) => {
        const mobileUnit = getMobileUnit(state);

        if (!mobileUnit) {
            console.log("no selected unit");
            return;
        }
        const pswd = (values["input-password"] || "").toLowerCase();
        console.log("Crafting with password:", pswd);
        const payload = ds.encodeCall("function password(string pswd)", [pswd]);
        console.log("Payload:", payload);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });

        console.log("Reset dispatched");
    };

    const noop = () => {};

    return {
        version: 1,
        components: [
            {
                id: "ResetTower",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html:
                            "<p>Labyrinth reset password:</p>" +
                            '<p><input id="input-password" type="password" name="input-password"></input></p>',
                        submit: (values) => {
                            reset(values);
                        },
                        buttons: [
                            {
                                text: "Reset",
                                type: "action",
                                action: noop,
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

function getMobileUnit(state) {
    return state?.selected?.mobileUnit;
}

function getSelectedTile(state) {
    const tiles = state?.selected?.tiles || {};
    return tiles && tiles.length === 1 ? tiles[0] : undefined;
}

function getBuildingOnTile(state, tile) {
    return (state?.world?.buildings || []).find(
        (b) => tile && b.location?.tile?.id === tile.id,
    );
}
