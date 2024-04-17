import ds from 'downstream';

const billboardName = "AA Billboard";
const billboardImage = "https://i.imgur.com/9RYtjYe.png";

export default async function update({ selected, world, player }) {
    const billboardBuilding = (world?.buildings || []).find(
        (b) => b.kind?.name?.value === billboardName,
    );
    const mapObj = [];
    if(billboardBuilding)
    {
        mapObj.push(
            {
                type: "building",
                key: "image",
                id: `${billboardBuilding.id}`,
                value: `${billboardImage}`,
            }
        );
    }
    return {
        version: 1,
        map: mapObj,
        components: [
            {
                type: 'building',
                id: 'aa-billboard',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: 'In the light'
                    }
                ],
            },
        ],
    };
}
