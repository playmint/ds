import ds from 'downstream';

const billboardName = "How To Play Ducks Vs Burgers";
const billboardImage = "https://i.imgur.com/ATHk8Qv.png";

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
                id: 'rules',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: ` You are on either Team Duck or Team Burger
                                
                            <ul style="padding-left: 30px;">
                                <li>Duck team should &quot;Build&quot; the &quot;Weak Duck&quot; buildings</li>
                                <li>Burger team should &quot;Build&quot; the &quot;Weak Burger&quot; buildings</li>
                                <li>Make sure you have enough goo to build. If you run low, collect some from the extractors at the side of the map</li>
                            </ul>
                                The winner is the team with the most buildings when the time ends`
                    }
                ],
            },
        ],
    };
}
