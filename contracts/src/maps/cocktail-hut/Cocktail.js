import ds from 'downstream';

export default async function update({ selected }) {
    // find the player's unit
    const { mobileUnit } = selected || {};

    // find the items the player's unit has equiped in inventory
    const equipedItems = mobileUnit?.bags.flatMap(
        (bag) => bag.slots.flatMap(
            (slot) => ({
                item: slot.item,
                bag: bag.equipee.key,
                slot: slot.key,
            })
        )) || [];

    // find any cocktails within those items
    const equipedCocktails = equipedItems.filter(item => item.item.name?.value === 'Cocktail')

    // find all the item's on-chain data attached to one of the cocktail items
    const cocktailData = equipedCocktails.map((item) => item.item.allData).find(() => true) || [];

    // fetch the value associated with the key "sips"
    const encodedSips = cocktailData.find(({name, value}) => name === 'sips')?.value;

    // decode the value as a number
    const numSips = typeof encodedSips === 'string' ? parseInt(encodedSips, 16) : 0;

    // for each cocktail equiped in inventory, take a sip and contribute to the
    // global count of all sips ever sipped
    const action = () => {
        if (!mobileUnit) {
            console.log('no selected unit');
            return;
        }
        if (!equipedCocktails || equipedCocktails.length == 0) {
            console.log('no equiped cocktails');
            return;
        }

        const actions = equipedCocktails.map(({item}) => {
            return {
                name: 'ITEM_USE',
                args: [
                    item.id,
                    mobileUnit.id,
                    ds.encodeCall("function sip()", []),
                ]
            };
        });

        ds.dispatch(...actions);
    };

    // due to a bug in the ITEM_USE implementation it is only possible to call
    // ITEM_USE on an item that is equip to either bag-0-slot-0 or bag-1-slot-1
    const isEquipToCompatibleSlot = equipedCocktails.some(({bag, slot}) => bag === slot);

    const html = isEquipToCompatibleSlot
        ? `<p>Total Sips Ever: ${numSips}</p>`
        : '<p>Move cocktail to bottom left inventory slot to drink</p>';

    return {
        version: 1,
        components: [
            {
                id: 'cocktail',
                type: 'item',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html,
                        buttons: [
                            {
                                text: 'Sip',
                                type: 'action',
                                action,
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

