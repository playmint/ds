import ds from "downstream";

const GOO_GREEN = 0;
const GOO_BLUE = 1;
const GOO_RED = 2;

const GOO_RESERVOIR_MAX = 500;
const GOO_PER_SEC = GOO_RESERVOIR_MAX / 120; // 4 goo a sec
const TILE_ATOM_MAX = 255;
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

export default function update({ selected, world }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding =
        selectedTile && selectedTile.building
            ? selectedTile.building
            : undefined;
    const selectedEngineer = mobileUnit;

    function calcExtractedGoo() {
        // Get the goo atoms for the tile
        const atoms = selectedTile.atoms
            .sort((a, b) => a.key - b.key)
            .map((elm) => elm.weight);

        // Get time passed
        const elapsedSecs =
            (world.block - selectedBuilding.timestamp[0].blockNum) *
            BLOCK_TIME_SECS;

        // How much would we have harvested if the tile goo was 255
        const maxHarvestPotential = elapsedSecs / GOO_PER_SEC;

        const extractedAtoms = [0, 0, 0];

        extractedAtoms[GOO_GREEN] = Math.min(
            Math.floor(
                (((atoms[GOO_GREEN] * 100) / TILE_ATOM_MAX) *
                    maxHarvestPotential) /
                    100
            ),
            GOO_RESERVOIR_MAX
        );
        extractedAtoms[GOO_BLUE] = Math.min(
            Math.floor(
                (((atoms[GOO_BLUE] * 100) / TILE_ATOM_MAX) *
                    maxHarvestPotential) /
                    100
            ),
            GOO_RESERVOIR_MAX
        );
        extractedAtoms[GOO_RED] = Math.min(
            Math.floor(
                (((atoms[GOO_RED] * 100) / TILE_ATOM_MAX) *
                    maxHarvestPotential) /
                    100
            ),
            GOO_RESERVOIR_MAX
        );

        return extractedAtoms;
    }

    let extractedGoo = calcExtractedGoo();

    // Sum the calculated goo with what's recorded in state
    if (selectedBuilding.gooReservoir) {
        for (let i = 0; i < selectedBuilding.gooReservoir.length; i++) {
            const goo = selectedBuilding.gooReservoir[i];
            extractedGoo[goo.key] = Math.min(
                goo.weight + extractedGoo[goo.key],
                GOO_RESERVOIR_MAX
            );
        }
    }

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
    const gooCost = Number(BigInt(out0.balance) * outItemAtomVals[gooIndex]);
    const numberOfItems = Math.floor(
        extractedGoo[gooIndex] / Number(outItemAtomVals[gooIndex])
    );

    // TODO: enable when there is enough goo in the reservoir
    const canExtract = gooCost <= extractedGoo[gooIndex];

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
                )} Goo from the ground and turns it into ${out0.balance} x ${
                    out0.item.name.value
                }`,
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
                            <p>Extracted ${numberOfItems} x ${
                            out0.item.name.value
                        }</p>
                        `,
                    },
                ],
            },
        ],
    };
}
