import ds from "downstream";

let UPDATE_COCKTAIL_MS = 100000;
let lastUpdated = Date.now();
let cocktail;

async function getCocktailOfTheMoment() {
    const now = Date.now();
    const recentlyUpdate = now - lastUpdated < UPDATE_COCKTAIL_MS;
    if (!cocktail || !recentlyUpdate) {
        lastUpdated = now;
        cocktail = await fetch(
            `https://www.thecocktaildb.com/api/json/v1/1/random.php`,
        ).then((res) => res.json());
    }
    if (!cocktail) {
        return "A Mystery";
    }
    const drink = cocktail.drinks.find(() => true);
    const ingriedients = [
        drink.strIngredient1,
        drink.strIngredient2,
        drink.strIngredient3,
        drink.strIngredient4,
        drink.strIngredient5,
    ].filter((ing) => !!ing);
    return `${drink.strDrink}: ${ingriedients.join(", ")}`;
}

export default async function update({ selected, world }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(
        (b) => selectedTile && b.location?.tile?.id === selectedTile.id,
    );
    const selectedBuildingBags = selectedBuilding
        ? (world?.bags || []).filter(
              (bag) => bag.equipee?.node.id === selectedBuilding.id,
          )
        : [];
    const inputBag =
        selectedBuilding &&
        selectedBuildingBags.find((bag) => bag.equipee.key === 0);
    const canPourDrink =
        inputBag &&
        inputBag.slots.length == 2 &&
        inputBag.slots.every((slot) => slot.balance > 0) &&
        mobileUnit;

    const cocktail = await getCocktailOfTheMoment();

    const craft = () => {
        if (!mobileUnit) {
            ds.log("no selected engineer");
            return;
        }
        if (!selectedBuilding) {
            ds.log("no selected building");
            return;
        }

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, []],
        });

        ds.log("Enjoy your drink!");
    };

    // find all the cocktail huts on the map
    const cocktailHuts = (world?.buildings || [])
        .filter(b => b.kind?.id === '0xbe92755c0000000000000000d286b4ae0000000000000003');
    // get tile ids surrounding each cocktail hut
    const cocktailHutNeighbours = cocktailHuts.map(b => {
        const [q,r,s] = getTileCoordsFromId(b.location?.tile?.id);
        const neighbourCoords = [
            { q: q + 1, r: r, s: s - 1 },
            { q: q + 1, r: r - 1, s: s },
            { q: q, r: r - 1, s: s + 1 },
            { q: q - 1, r: r, s: s + 1 },
            { q: q - 1, r: r + 1, s: s },
            { q: q, r: r + 1, s: s - 1 },
        ];
        const neighbourTileIds = neighbourCoords.map(({q,r,s}) => {
            const prefix = "0xe5a62ffc";
            // 000000000000000000000000 0000 0000 0000 0000",
            return `${prefix}0000000000000000000000000000${toInt16Hex(q)}${toInt16Hex(r)}${toInt16Hex(s)}`;
        });
        return neighbourTileIds;
    });
    // build a list of map properties to set for each neighbour
    const mapProps = cocktailHutNeighbours.flatMap(neighbours => neighbours.map(id => ({
        type: "tile",
        key: "color",
        id,
        value: "red",
    })));


    return {
        version: 1,
        map: [
            ...mapProps,
        ],
        components: [
            {
                id: "cocktail-hut",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        buttons: [
                            {
                                text: "Pour Cocktail",
                                type: "action",
                                action: craft,
                                disabled: !canPourDrink,
                            },
                        ],
                        html: `
                            <p>We supply the best drinks in Hexwood!</p>
                            <br />
                            <p>The current cocktail is:</p>
                            <br />
                            <strong>${cocktail}</strong>
                            <br />
                            <br />
                        `,
                    },
                ],
            },
        ],
    };
}

function getTileCoordsFromId(tileId) {
    const coords = [...tileId]
        .slice(2)
        .reduce((bs, b, idx) => {
            if (idx % 4 === 0) {
                bs.push('0x');
            }
            bs[bs.length - 1] += b;
            return bs;
        }, [])
        .map((n) => Number(fromTwos(n, 16)))
        .slice(-3);
    if (coords.length !== 3) {
        throw new Error(`failed to get q,r,s from tile id ${tileId}`);
    }
    return coords;
};

const BN_0 = BigInt(0);
const BN_1 = BigInt(1);
function fromTwos(n, w) {
    let value = BigInt(n);
    let width = BigInt(w);
    if (value >> (width - BN_1)) {
        const mask = (BN_1 << width) - BN_1;
        return -(((~value) & mask) + BN_1);
    }
    return value;
}

function toTwos(_value, _width) {
    let value = BigInt(_value);
    let width = BigInt(_width);
    const limit = (BN_1 << (width - BN_1));
    if (value < BN_0) {
        value = -value;
        const mask = (BN_1 << width) - BN_1;
        return ((~value) & mask) + BN_1;
    }
    return value;
}

function toInt16Hex(value) {
    return ('0000'+toTwos(value, 16).toString(16)).slice(-4)
}
