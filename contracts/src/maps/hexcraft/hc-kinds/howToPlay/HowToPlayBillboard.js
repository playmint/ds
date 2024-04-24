import ds from 'downstream';

const billboardName = "How To Play Hexcraft";
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
                        html: `Join a team and head to your base.\nRed team are on the left, Blue team on the right
                                
                            <ul style="padding-left: 30px;">
                                <li>Go to your team's base, and craft a weapon to set your class. You can only choose one!</li>
                                <li>Once setup, only travel through the middle of the map. Going around the borders is STRICTLY PROHIBITED!</li>
                                <li>Attack their base, or defend your own. Strategise where each team member is needed</li>
                                <li>You can build a Cannon to join your team's attack - you need a Crafting Hammer from the blacksmith to build this</li>
                            </ul>
                                First team to destroy the other's Base building wins!`
                    }
                ],
            },
        ],
    };
}
