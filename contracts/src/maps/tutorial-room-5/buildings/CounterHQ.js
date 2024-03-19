import ds from "downstream";

export default async function update(state) {
    const mobileUnit = getMobileUnit(state);
    const buildings = state.world?.buildings || [];
    const counterHQ = getBuildingsByType(buildings, "Counter HQ")[0];
    if (!counterHQ) {
        return {
            version: 1,
            components: [
                {
                    id: "counter-hq",
                    type: "building",
                    content: [
                        {
                            id: "default",
                            type: "inline",
                            html: `Unable to find Counter HQ building`,

                            buttons: [],
                        },
                    ],
                },
            ],
        };
    }

    const counterBuildings = getBuildingsByType(buildings, "counter");

    const count = getDataInt(counterHQ, "count");

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
