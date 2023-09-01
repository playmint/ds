import ds from "downstream";

const GOO_GREEN = 0;
const GOO_BLUE = 1;
const GOO_RED = 2;

const GOO_RESERVOIR_MAX = 500;
// const TILE_ATOM_MAX = 255;
const BLOCK_TIME_SECS = 2;

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
    if (atomVal < 70) return 0;

    const x = atomVal - 63;
    const baseSecsPerGoo = 120 * Math.pow(0.973, x);

    if (atomVal >= 165) return Math.max(baseSecsPerGoo * 0.75, 4);
    else if (atomVal >= 155) return baseSecsPerGoo * 0.85;
    else return baseSecsPerGoo;
};

const getGooPerSec = (atomVal) => {
    const secsPerGoo = getSecsPerGoo(atomVal);
    return secsPerGoo > 0 ? Math.floor((1 / secsPerGoo) * 100) / 100 : 0;
};

export default function update({ selected, world }, block) {
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
        (block - selectedBuilding.timestamp[0].blockNum) *
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

    const canExtract =
        numberOfItems >= 1 &&
        (!selectedBuilding.bags[1].bag.owner ||
            selectedBuilding.bags[1].bag.owner.id == mobileUnit.owner.id);

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
    const reservoirPercent = Math.floor( (extractedGoo[gooIndex] / GOO_RESERVOIR_MAX) * 100);
    const extractableNow = Math.min(numberOfItems, 100);

    return {
        version: 1,
        components: [
            {
                id: "extractor",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        buttons: [
                            {
                                text: `EXTRACT ${extractableNow} ${getGooColor(gooIndex).toUpperCase()} GOO`,
                                type: "action",
                                action: extract,
                                disabled: !canExtract,
                            },
                        ],
                        html: `
                            <div>EXTRACTOR CAPACITY</div>
                            <div style="width: 26rem; height: 28px; border: 1px solid #fff; position: relative;">
                                <div style="position: absolute; top:0; left:0; height: 100%; width: ${reservoirPercent}%; background: #fff;"></div>
                                <div style="position: absolute; top:0; left:0; height: 100%; width: 100%; mix-blend-mode: difference; text-align: center; margin-top: 2px;">${reservoirPercent}%</div>
                            </div>
                            <br />
                            <div>SLOT CAPACITY</div>
                            <div style="width: 26rem; height: 28px; border: 1px solid #fff; position: relative;">
                                <div style="position: absolute; top:0; left:0; height: 100%; width: ${extractableNow}%; background: #fff;"></div>
                                <div style="position: absolute; top:0; left:0; height: 100%; width: 100%; mix-blend-mode: difference; text-align: center; margin-top: 4px;">${extractableNow} READY</div>
                            </div>
                        ${
                            selectedBuilding.bags[1].bag.owner &&
                            selectedBuilding.bags[1].bag.owner.id !=
                                mobileUnit.owner.id
                                ? `</br><p>You are not the owner of this extractor, only the owner can extract goo from here</p>`
                                : ``
                        }
                        </p>
                        `,
                    },
                ],
            },
        ],
    };
}
