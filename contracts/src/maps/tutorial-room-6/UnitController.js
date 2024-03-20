import ds from "downstream";

export default async function update(state) {
    // const buildings = state.world?.buildings || [];
    const mobileUnit = getMobileUnit(state);
    const selectedTile = getSelectedTile(state);
    const selectedBuilding =
        selectedTile && getBuildingOnTile(state, selectedTile);

    if (!selectedBuilding || !mobileUnit) {
        return {
            version: 1,
            components: [],
        };
    }

    const spawnUnit = () => {
        const payload = ds.encodeCall("function spawnUnit()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };

    return {
        version: 1,
        components: [
            {
                id: "tutorial-6",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: ``,

                        buttons: [
                            {
                                text: "Spawn Unit",
                                type: "action",
                                action: spawnUnit,
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

const getBuildingsByType = (buildingsArray, type) => {
    return buildingsArray.filter((building) =>
        building.kind?.name?.value.toLowerCase().includes(type),
    );
};
