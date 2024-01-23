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

    return {
        version: 1,
        map: [
            {
                type: "building",
                key: "label",
                id: "0x32750923750",
                value: "hello",
            },
            {
                type: "tile",
                key: "color",
                id: "0xe5a62ffc0000000000000000000000000000000000000000",
                value: "red",
            },
            {
                type: "building",
                id: "0x123",
                key: "countdown-starts",
                value: 100,
            },
            {
                type: "building",
                id: "0x123",
                key: "countdown-ends",
                value: 120,
            },
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
