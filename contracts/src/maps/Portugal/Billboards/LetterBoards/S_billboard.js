import ds from 'downstream';

const billboardName = "-S-";
const billboardImage = "https://i.imgur.com/aksutmQ.png";

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
                id: 's-billboard',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: 'S'
                    }
                ],
            },
        ],
    };
}
