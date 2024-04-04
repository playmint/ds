import ds from "downstream";

let UPDATE_COCKTAIL_MS = 100000;
let lastUpdated = Date.now();
let cocktail;
const billboardName = "Cocktail Billboard";

/**
 * Asynchronously fetches a random cocktail from an API if the current cocktail is outdated or not set.
 * It ensures that the cocktail data is fetched at most once every UPDATE_COCKTAIL_MS milliseconds.
 * @returns {string} A string describing the current cocktail and its ingredients.
 */
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
    const cocktailImage = drink.strDrinkThumb;
    return {recipe:`${drink.strDrink}: ${ingriedients.join(", ")}`, cocktailImage: cocktailImage};
}

const BN_0 = BigInt(0);
const BN_1 = BigInt(1);

/**
 * Converts a two's complement binary representation to a BigInt.
 * @param {number|string} n - The two's complement binary number.
 * @param {number} w - The width (in bits) of the binary number.
 * @returns {BigInt} The BigInt representation of the binary number.
 */
function fromTwos(n, w) {
    let value = BigInt(n);
    let width = BigInt(w);
    if (value >> (width - BN_1)) {
        const mask = (BN_1 << width) - BN_1;
        return -(((~value) & mask) + BN_1);
    }
    return value;
}

/**
 * Converts a BigInt to a two's complement binary representation.
 * @param {BigInt} _value - The BigInt number to convert.
 * @param {number} _width - The desired width of the binary representation.
 * @returns {BigInt} The two's complement binary representation of the value.
 */
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

/**
 * Converts an integer value to a hexadecimal string of 16 bits width
 * @param {number} value - The integer value to convert.
 * @returns {string} A 4-character hexadecimal string representation of the value.
 */
function toInt16Hex(value) {
    return ('0000'+toTwos(value, 16).toString(16)).slice(-4)
}

/**
 * Decodes a tile ID into its q, r, s hexagonal coordinates.
 * @param {string} tileId - The ID of the tile to decode.
 * @returns {Array} An array containing the q, r, s coordinates of the tile.
 */
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
        .slice(-4);
    if (coords.length !== 4) {
        throw new Error(`failed to get z,q,r,s from tile id ${tileId}`);
    }
    return coords;
};

/**
 * Calculates the IDs of tiles neighboring a given building based on its location.
@param {object} building - The building object containing location information.
@returns {Array} An array of strings representing the IDs of the neighboring tiles.
*/
function getBuildingNeighbourTiles(building) {
    const [z,q,r,s] = getTileCoordsFromId(building.location?.tile?.id);
    const neighbourCoords = [
        { z: z, q: q + 1, r: r, s: s - 1 },
        { z: z, q: q + 1, r: r - 1, s: s },
        { z: z, q: q, r: r - 1, s: s + 1 },
        { z: z, q: q - 1, r: r, s: s + 1 },
        { z: z, q: q - 1, r: r + 1, s: s },
        { z: z, q: q, r: r + 1, s: s - 1 },
    ];
    const neighbourTileIds = neighbourCoords.map(({z,q,r,s}) => {
        const prefix = "0xe5a62ffc";
        return `${prefix}00000000000000000000${toInt16Hex(z)}${toInt16Hex(q)}${toInt16Hex(r)}${toInt16Hex(s)}`;
    });
    return neighbourTileIds;
}

export default async function update({ selected, world }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(
        (b) => selectedTile && b.location?.tile?.id === selectedTile.id,
    );

    const billboardBuilding = (world?.buildings || []).find(
        (b) => b.kind?.name?.value === billboardName,
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

    const {recipe, cocktailImage} = await getCocktailOfTheMoment();

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

    const mapObj = [];
    if (selectedBuilding)
    {
        getBuildingNeighbourTiles(selectedBuilding).forEach((t) => {
            mapObj.push(
                {
                    type: "tile",
                    key: "color",
                    id: `${t}`,
                    value: "red",
                }
            );
        });
    }
    if(billboardBuilding)
    {
        mapObj.push(
            {
                type: "building",
                key: "image",
                id: `${billboardBuilding.id}`,
                value: `${cocktailImage}`,
            }
        );
    }

    return {
        version: 1,
        map: mapObj,
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
                            <strong>${recipe}</strong>
                            <br />
                            <br />
                        `,
                    },
                ],
            },
        ],
    };
}
