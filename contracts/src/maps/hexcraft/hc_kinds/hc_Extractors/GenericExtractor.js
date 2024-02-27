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

    const x = atomVal - 70;
    const baseSecsPerGoo = 120 * Math.pow(0.985, x);
    /*
    if (atomVal >= 165) return Math.max(baseSecsPerGoo * 0.75, 20);
    else if (atomVal >= 155) return baseSecsPerGoo * 0.85;
    else return baseSecsPerGoo;
    */
    ///speeding up 10x
    if (atomVal >= 165) return Math.max(baseSecsPerGoo * 0.75 * 0.2, 4);
    else if (atomVal >= 155) return Math.max(baseSecsPerGoo * 0.85 * 0.2, 4);
    else return Math.max(baseSecsPerGoo * 0.2, 4);
};

const getGooPerSec = (atomVal) => {
    const secsPerGoo = getSecsPerGoo(atomVal);
    return secsPerGoo > 0 ? ((1 / secsPerGoo) * 100) / 100 : 0;
};

export default function update({ selected, world }, block) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(
        (b) => selectedTile && b.location?.tile?.id === selectedTile.id,
    );
    const tileAtoms = (selectedTile?.atoms || [])
        .sort((a, b) => a.key - b.key)
        .map((elm) => elm.weight);
    const lastExtraction = selectedBuilding?.timestamp?.blockNum || 0;
    const elapsedSecs =
        selectedBuilding && lastExtraction
            ? (block - lastExtraction) * BLOCK_TIME_SECS
            : 0;

    // Calculate extracted goo and sum with previously extracted goo
    let extractedGoo = tileAtoms
        .map((atomVal) => Math.floor(getGooPerSec(atomVal) * elapsedSecs))
        .map((calculatedGoo, index) => {
            const totalGoo =
                selectedBuilding?.gooReservoir &&
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
    if (!out0) {
        return {};
    }
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
    const numberOfItems =
        typeof gooIndex !== "undefined"
            ? Math.floor(
                  extractedGoo[gooIndex] / Number(outItemAtomVals[gooIndex]),
              )
            : 0;
    const secondsTilNextItem = getSecsPerGoo(tileAtoms[gooIndex]);

    const selectedBuildingBags = selectedBuilding
        ? (world?.bags || []).filter(
              (bag) => bag.equipee?.node.id === selectedBuilding.id,
          )
        : [];
    const outputBag = selectedBuilding
        ? selectedBuildingBags.find((bag) => bag.equipee.key === 1)
        : undefined;
    const canExtract =
        numberOfItems >= 1 &&
        (!outputBag?.owner || outputBag?.owner.id == mobileUnit?.owner.id);

    const extract = () => {
        if (!mobileUnit) {
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
            args: [selectedBuilding.id, mobileUnit.id, []],
        });
    };
    const reservoirPercent = Math.floor(
        (extractedGoo[gooIndex] / GOO_RESERVOIR_MAX) * 100,
    );
    const extractableNow = Math.min(numberOfItems, 100);
    const css = `
        @keyframes extractorttni {
            from { width: 0%; }
            to { width: 99%; }
        }

        .extractor-progress-bar {
            width: 26rem;
            height: 28px;
            background: #E4E1EB;
            position: relative;
        }

        .extractor-progress-text {
            position: absolute;
            top:0; left:0;
            height: 100%;
            width: 100%;
            text-align: center;
            margin-top: 2px;
        }

        .extractor-progress-percent {
            position: absolute;
            top: 0;
            left: 0;
            height:100%;
            background: #B25001;
        }

        .extractor-progress-tick {
            animation: extractorttni;
            animation-delay: 0;
            transition: width 0.5s;
            width: 100%;
            animation-iteration-count: infinite;
        }
    `;

    const liveExtractionTicker =
        reservoirPercent < 100 && secondsTilNextItem > 0
            ? `<div class="extractor-progress-bar" style="height: 3px;"> <div class="extractor-progress-percent extractor-progress-tick" style="animation-duration: ${secondsTilNextItem}s;"></div></div>`
            : ``;

    const status = `
        <br />
        <div class="extractor-progress-bar">
            <div class="extractor-progress-percent" style="width: ${reservoirPercent}%; background: #FB7001;"></div>
            <div class="extractor-progress-text">${numberOfItems} / ${GOO_RESERVOIR_MAX}</div>
        </div>
        ${liveExtractionTicker}
        <style>
            ${css}
        </style>
    `;

    const neverExtractWarning =
        secondsTilNextItem === 0
            ? `<br/><p>This extractor is not functioning as the goo extraction rate for this tile is too low to be effective</p>`
            : ``;

    const notOwnerWarning =
        outputBag.owner && outputBag.owner.id != mobileUnit?.owner.id
            ? `</br><p>You are not the owner of this extractor, only the owner can extract goo from here</p>`
            : ``;

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
                                text: `EXTRACT ${extractableNow} ${getGooColor(
                                    gooIndex,
                                ).toUpperCase()} GOO`,
                                type: "action",
                                action: extract,
                                disabled: !canExtract,
                            },
                        ],
                        html: `
                            ${notOwnerWarning}
                            ${neverExtractWarning}
                            ${status}
                        `,
                    },
                    {
                        id: "view",
                        type: "inline",
                        html: `
                            ${neverExtractWarning}
                            ${status}
                        `,
                    },
                ],
            },
        ],
    };
}
