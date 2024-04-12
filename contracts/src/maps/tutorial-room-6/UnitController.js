import ds from "downstream";

export default async function update(state) {
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

    const { mobileUnits } = state.world;

    // We slice the last 40 characters (20 bytes) from the ids which is the address
    const buildingUnit = mobileUnits.find(
        (unit) =>
            unit.owner.id.slice(-40) ===
            selectedBuilding.kind.implementation.id.slice(-40),
    );

    const moveNE = () => {
        const payload = ds.encodeCall("function moveUnitNE()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };
    const moveE = () => {
        const payload = ds.encodeCall("function moveUnitE()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };
    const moveSE = () => {
        const payload = ds.encodeCall("function moveUnitSE()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };
    const moveSW = () => {
        const payload = ds.encodeCall("function moveUnitSW()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };
    const moveW = () => {
        const payload = ds.encodeCall("function moveUnitW()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };
    const moveNW = () => {
        const payload = ds.encodeCall("function moveUnitNW()", []);

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
                                disabled: buildingUnit,
                            },
                            {
                                text: "Move Unit ↗️",
                                type: "action",
                                action: moveNE,
                                disabled: !buildingUnit,
                            },
                            {
                                text: "Move Unit ➡️",
                                type: "action",
                                action: moveE,
                                disabled: !buildingUnit,
                            },
                            {
                                text: "Move Unit ↘️",
                                type: "action",
                                action: moveSE,
                                disabled: !buildingUnit,
                            },
                            {
                                text: "Move Unit ↙️",
                                type: "action",
                                action: moveSW,
                                disabled: !buildingUnit,
                            },
                            {
                                text: "Move Unit ←",
                                type: "action",
                                action: moveW,
                                disabled: !buildingUnit,
                            },
                            {
                                text: "Move Unit ↖️",
                                type: "action",
                                action: moveNW,
                                disabled: !buildingUnit,
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
