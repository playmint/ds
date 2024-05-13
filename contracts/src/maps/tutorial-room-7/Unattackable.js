import ds from "downstream";

export default async function update(state) {

    const selectedTile = getSelectedTile(state);
    const selectedBuilding =
        selectedTile && getBuildingOnTile(state, selectedTile);

    const toggleUnwalkableTiles = () => {
        const mobileUnit = getMobileUnit(state);
        if (!mobileUnit) {
            console.log("no selected unit");
            return;
        }

        const payload = ds.encodeCall("function toggleUnwalkableTiles(bytes24)", [
            selectedBuilding.id,
        ]);

        ds.dispatch({
            name: "ZONE_USE",
            args: [mobileUnit.id, payload],
        });
    };

    return {
        version: 1,
        components: [
            {
                id: "unattackable",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: "<p>This button calls dispatches the <code>ZONE_USE</code> action</p>",
                        buttons: [
                            {
                                text: "Toggle Tiles",
                                type: "action",
                                action: toggleUnwalkableTiles,
                                disabled: false,
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