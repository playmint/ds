import ds from 'downstream';


export default async function update({ selected, world, player }) {

    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'litora',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `
                            The place to imagine and fabricate new worlds.
                            <ul style="padding-left: 30px;">
                            <li><a href="/tile-fabricator">Tile Fabricator</a></li>
                            </ul>
                        `
                    }
                ],
            },
        ],
    };
}
