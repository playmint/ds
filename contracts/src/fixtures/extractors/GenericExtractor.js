import ds from "downstream";

const GOO_GREEN = 0;
const GOO_BLUE = 1;
const GOO_RED = 2;

const GOO_RESERVOIR_MAX = 500;
// const TILE_ATOM_MAX = 255;
const BLOCK_TIME_SECS = 10;

function getGooColor(gooIndex) {
    switch (gooIndex) {
        case GOO_GREEN:
            return "Green";
        case GOO_BLUE:
            return "Blue";
        case GOO_RED:
            return "Red";
    }
}

// https://www.notion.so/playmint/Extraction-6b36dcb3f95e4ab8a57cb6b99d24bb8f#cb8cc764f9ef436e9847e631ef12b157

const getSecsPerGoo = (atomVal) => {
    if (atomVal < 10) return 0;

    const x = atomVal - 32;
    const baseSecsPerGoo = 120 * Math.pow(0.98, x);

    if (atomVal >= 200) return baseSecsPerGoo / 4;
    else if (atomVal >= 170) return baseSecsPerGoo / 2;
    else return baseSecsPerGoo;
};

const getGooPerSec = (atomVal) => {
    const secsPerGoo = getSecsPerGoo(atomVal);
    return secsPerGoo > 0 ? Math.floor((1 / secsPerGoo) * 100) / 100 : 0;
};

export default function update({ selected, world }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding =
        selectedTile && selectedTile.building
            ? selectedTile.building
            : undefined;
    const selectedEngineer = mobileUnit;
    const tileAtoms = selectedTile.atoms
        .sort((a, b) => a.key - b.key)
        .map((elm) => elm.weight);
    const elapsedSecs =
        (world.block - selectedBuilding.timestamp[0].blockNum) *
        BLOCK_TIME_SECS;

    // Calculate extracted goo and sum with previously extracted goo
    let extractedGoo = tileAtoms
        .map((atomVal) => Math.floor(getGooPerSec(atomVal) * elapsedSecs))
        .map((calculatedGoo, index) => {
            const totalGoo =
                selectedBuilding.gooReservoir &&
                selectedBuilding.gooReservoir.length > index
                    ? calculatedGoo +
                      selectedBuilding.gooReservoir[index].weight
                    : calculatedGoo;
            return Math.min(GOO_RESERVOIR_MAX, totalGoo);
        });

    // Use the output item to infer which type of extractor this is
    // fetch our output item details
    const expectedOutputs = selectedBuilding?.kind?.outputs || [];
    const out0 = expectedOutputs?.find((slot) => slot.key == 0);
    const outItemAtomVals = [...out0.item.id]
        .slice(2)
        .reduce((bs, b, idx) => {
            if (idx % 8 === 0) {
                bs.push("0x");
            }
            bs[bs.length - 1] += b;
            return bs;
        }, [])
        .map((n) => BigInt(n))
        .slice(-3);

    const gooIndex = outItemAtomVals.findIndex((gooVal) => gooVal > 0n);
    // const gooCost = Number(BigInt(out0.balance) * outItemAtomVals[gooIndex]);
    const numberOfItems = Math.floor(
        extractedGoo[gooIndex] / Number(outItemAtomVals[gooIndex])
    );

    const canExtract = numberOfItems >= 1;

    const extract = () => {
        if (!selectedEngineer) {
            ds.log("no selected engineer");
            return;
        }
        if (!selectedBuilding) {
            ds.log("no selected building");
            return;
        }

        ds.log("about to dispatch BUILDING_USE");
        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, selectedEngineer.id, []],
        });
    };

    return {
        version: 1,
        components: [
            {
                id: "extractor",
                type: "building",
                title: `${getGooColor(gooIndex)} Extractor`,
                summary: `Extracts ${getGooColor(
                    gooIndex
                )} Goo from the ground at a rate of ${
                    gooIndex < tileAtoms.length
                        ? getGooPerSec(tileAtoms[gooIndex])
                        : 0
                } goo per second`,
                content: [
                    {
                        id: "default",
                        type: "inline",
                        buttons: [
                            {
                                text: "Extract",
                                type: "action",
                                action: extract,
                                disabled: !canExtract,
                            },
                        ],
                        html: `
                            <p>Reservoir is ${Math.floor(
                                (extractedGoo[gooIndex] / GOO_RESERVOIR_MAX) *
                                    100
                            )}% full</p>
                            <p>Extracted ${
                                extractedGoo[gooIndex]
                            } ${getGooColor(
                            gooIndex
                        )} Goo (${numberOfItems} items)</p>
                        </p>
                        `,
                    },
                ],
            },
        ],
    };
}
