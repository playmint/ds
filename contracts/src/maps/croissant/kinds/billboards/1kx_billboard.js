import ds from 'downstream';

const billboardName = "1kx Billboard";
const billboardImage = "http://localhost:3000/favicon-28978_favicon-192.png";

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
                id: '1kx-billboard',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `
                            <p>Hexcraft</p>
                        `
                    }
                ],
            },
        ],
    };
}
