import ds from "downstream";

const BLOCK_TIME_SECS = 2;

export default async function update(state, block) {
    const mobileUnit = getMobileUnit(state);
    const buildings = state.world?.buildings || [];
    const countdownHQ = getBuildingsByType(buildings, "Countdown HQ")[0];
    if (!countdownHQ) {
        return {
            version: 1,
            components: [
                {
                    id: "countdown-hq",
                    type: "building",
                    content: [
                        {
                            id: "default",
                            type: "inline",
                            html: `Unable to find Countdown HQ building`,

                            buttons: [],
                        },
                    ],
                },
            ],
        };
    }

    console.log("countdownHQ", countdownHQ);

    const countdownBuildings = getBuildingsByType(buildings, "Countdown");

    const nowBlock = block;
    const startBlock = getDataInt(countdownHQ, "startBlock");
    const endBlock = getDataInt(countdownHQ, "endBlock");

    const remainingBlocks = Math.max(endBlock - nowBlock, 0);
    const elapsedBlocks = nowBlock - startBlock;
    const remainingTimeMs = remainingBlocks * 2 * 1000;
    const elapsedTimeMS = elapsedBlocks * 2 * 1000;

    const now = Date.now();
    const startTime = now - elapsedTimeMS;
    const endTime = now + remainingTimeMs;

    const startTimer = (durationSecs) => {
        const endBlock = nowBlock + durationSecs / BLOCK_TIME_SECS;

        const payload = ds.encodeCall("function startTimer(uint256)", [
            endBlock,
        ]);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [countdownHQ.id, mobileUnit.id, payload],
        });
    };

    return {
        version: 1,
        map: countdownBuildings.flatMap((b) => [
            {
                type: "building",
                id: `${b.id}`,
                key: "countdown-start",
                value: `${startTime}`,
            },
            {
                type: "building",
                id: `${b.id}`,
                key: "countdown-end",
                value: `${endTime}`,
            },
        ]),
        components: [
            {
                id: "countdown-HQ",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: ``,

                        buttons: [
                            {
                                text: "Start 30 second timer",
                                type: "action",
                                action: () => startTimer(30),
                            },
                            {
                                text: "Start 1 minute timer",
                                type: "action",
                                action: () => startTimer(60),
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

function distance(tileCoords, nextTile) {
    return Math.max(
        Math.abs(tileCoords[0] - nextTile[0]),
        Math.abs(tileCoords[1] - nextTile[1]),
        Math.abs(tileCoords[2] - nextTile[2]),
    );
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
