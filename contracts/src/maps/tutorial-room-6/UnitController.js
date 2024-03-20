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

    const { mobileUnits } = state.world;

    // We slice the first 10 characters from the ids to remove the 0x and Node prefix so we are left with the address part of the id
    const buildingUnits = mobileUnits.filter(
        (unit) =>
            unit.owner.id.slice(10) ===
            selectedBuilding.kind.implementation.id.slice(10),
    );

    const spawnUnit = () => {
        const payload = ds.encodeCall("function spawnUnit()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };

    const moveNE = () => {
        buildingUnits.forEach((unit) => {
            const payload = ds.encodeCall(
                "function moveUnitNE(bytes24 mobileUnit)",
                [unit.id],
            );

            ds.dispatch({
                name: "BUILDING_USE",
                args: [selectedBuilding.id, mobileUnit.id, payload],
            });
        });
    };
    const moveE = () => {
        buildingUnits.forEach((unit) => {
            const payload = ds.encodeCall(
                "function moveUnitE(bytes24 mobileUnit)",
                [unit.id],
            );

            ds.dispatch({
                name: "BUILDING_USE",
                args: [selectedBuilding.id, mobileUnit.id, payload],
            });
        });
    };
    const moveSE = () => {
        buildingUnits.forEach((unit) => {
            const payload = ds.encodeCall(
                "function moveUnitSE(bytes24 mobileUnit)",
                [unit.id],
            );

            ds.dispatch({
                name: "BUILDING_USE",
                args: [selectedBuilding.id, mobileUnit.id, payload],
            });
        });
    };
    const moveSW = () => {
        buildingUnits.forEach((unit) => {
            const payload = ds.encodeCall(
                "function moveUnitSW(bytes24 mobileUnit)",
                [unit.id],
            );

            ds.dispatch({
                name: "BUILDING_USE",
                args: [selectedBuilding.id, mobileUnit.id, payload],
            });
        });
    };
    const moveW = () => {
        buildingUnits.forEach((unit) => {
            const payload = ds.encodeCall(
                "function moveUnitW(bytes24 mobileUnit)",
                [unit.id],
            );

            ds.dispatch({
                name: "BUILDING_USE",
                args: [selectedBuilding.id, mobileUnit.id, payload],
            });
        });
    };
    const moveNW = () => {
        buildingUnits.forEach((unit) => {
            const payload = ds.encodeCall(
                "function moveUnitNW(bytes24 mobileUnit)",
                [unit.id],
            );

            ds.dispatch({
                name: "BUILDING_USE",
                args: [selectedBuilding.id, mobileUnit.id, payload],
            });
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
                            {
                                text: "Move Unit ↗️",
                                type: "action",
                                action: moveNE,
                                disabled: buildingUnits.length === 0,
                            },
                            {
                                text: "Move Unit ➡️",
                                type: "action",
                                action: moveE,
                                disabled: buildingUnits.length === 0,
                            },
                            {
                                text: "Move Unit ↘️",
                                type: "action",
                                action: moveSE,
                                disabled: buildingUnits.length === 0,
                            },
                            {
                                text: "Move Unit ↙️",
                                type: "action",
                                action: moveSW,
                                disabled: buildingUnits.length === 0,
                            },
                            {
                                text: "Move Unit ←",
                                type: "action",
                                action: moveW,
                                disabled: buildingUnits.length === 0,
                            },
                            {
                                text: "Move Unit ↖️",
                                type: "action",
                                action: moveNW,
                                disabled: buildingUnits.length === 0,
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
