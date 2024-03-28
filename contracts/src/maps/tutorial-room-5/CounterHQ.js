import ds from "downstream";

export default async function update(state) {
    const mobileUnit = getMobileUnit(state);
    const buildings = state.world?.buildings || [];
    const counterHQ = getBuildingsByType(buildings, "Counter HQ")[0];
    const count = getDataInt(counterHQ, "count");

    const counterBuildings = getBuildingsByType(buildings, "counter").filter(
        (b) =>
            distance(b.location.tile.coords, counterHQ.location.tile.coords) <=
            2,
    );

    const IncrementCounter = () => {
        const payload = ds.encodeCall("function increment()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [counterHQ.id, mobileUnit.id, payload],
        });
    };

    return {
        version: 1,
        map: counterBuildings.map((b) => ({
            type: "building",
            id: `${b.id}`,
            key: "labelText",
            value: `${count % 100}`,
        })),
        components: [
            {
                id: "counter-hq",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: ``,

                        buttons: [
                            {
                                text: "Increment Counter",
                                type: "action",
                                action: IncrementCounter,
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

const getBuildingsByType = (buildingsArray, type) => {
    return buildingsArray.filter(
        (building) =>
            building.kind?.name?.value.toLowerCase().trim() ==
            type.toLowerCase().trim(),
    );
};

function distance(signedHexCoordsA, signedHexCoordsB) {
    const coordA = signedHexCoordsA.map(hexToSignedDecimal);
    const coordB = signedHexCoordsB.map(hexToSignedDecimal);

    return Math.max(
        Math.abs(coordA[0] - coordB[0]),
        Math.abs(coordA[1] - coordB[1]),
        Math.abs(coordA[2] - coordB[2]),
    );
}

function hexToSignedDecimal(hex) {
    if (hex.startsWith("0x")) {
        hex = hex.substr(2);
    }

    let num = parseInt(hex, 16);
    let bits = hex.length * 4;
    let maxVal = Math.pow(2, bits);

    // Check if the highest bit is set (negative number)
    if (num >= maxVal / 2) {
        num -= maxVal;
    }

    return num;
}

// -- Onchain data helpers --

function getDataInt(buildingInstance, key) {
    var hexVal = getData(buildingInstance, key);
    return typeof hexVal === "string" ? parseInt(hexVal, 16) : 0;
}

function getData(buildingInstance, key) {
    return getKVPs(buildingInstance)[key];
}

function getKVPs(buildingInstance) {
    return (buildingInstance.allData || []).reduce((kvps, data) => {
        kvps[data.name] = data.value;
        return kvps;
    }, {});
}
