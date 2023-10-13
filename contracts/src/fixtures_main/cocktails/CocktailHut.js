import ds from 'downstream';

let UPDATE_COCKTAIL_MS = 100000;
let lastUpdated = Date.now();
let cocktail;

async function getCocktailOfTheMoment() {
    const now = Date.now();
    const recentlyUpdate = now - lastUpdated < UPDATE_COCKTAIL_MS;
    if (!cocktail || !recentlyUpdate) {
        lastUpdated = now;
        cocktail = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/random.php`)
            .then(res => res.json());
    }
    if (!cocktail) {
        return 'A Mystery';
    }
    const drink = cocktail.drinks.find(() => true);
    const ingriedients = [
        drink.strIngredient1,
        drink.strIngredient2,
        drink.strIngredient3,
        drink.strIngredient4,
        drink.strIngredient5,
    ].filter(ing => !!ing);
    return `${drink.strDrink}: ${ingriedients.join(', ')}`;
}

export default async function update({ selected }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile && selectedTile.building ? selectedTile.building : undefined;
    const selectedEngineer = mobileUnit;
    const inputBag = selectedBuilding && selectedBuilding.bags.find(b => b.key == 0).bag;
    const canPourDrink = inputBag && inputBag.slots.length == 2 && inputBag.slots.every(slot => slot.balance > 0) && selectedEngineer;

    const cocktail = await getCocktailOfTheMoment();

    const craft = () => {
        if (!selectedEngineer) {
            ds.log('no selected engineer');
            return;
        }
        if (!selectedBuilding) {
            ds.log('no selected building');
            return;
        }

        ds.dispatch(
            {
                name: 'BUILDING_USE',
                args: [selectedBuilding.id, selectedEngineer.id, []]
            },
        );

        ds.log('Enjoy your drink!');
    };

    return {
        version: 1,
        components: [
            {
                id: 'cocktail-hut',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        buttons: [ { text: 'Pour Cocktail', type: 'action', action: craft, disabled: !canPourDrink } ],
                        html: `
                            <p>We supply the best drinks in Hexwood!</p>
                            <br />
                            <p>The current cocktail is:</p>
                            <br />
                            <strong>${cocktail}</strong>
                            <br />
                            <br />
                        `
                    },
                ],
            },
        ],
    };
}
