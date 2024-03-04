import ds from 'downstream';


export default async function update({ selected, world, player }) {

    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'tile-fabricator',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `
                            The place to fabricate new worlds.
                            <ul style="padding-left: 30px;">
                            <li><a href="/building-fabricator">Tile Fabricator</a></li>
                            </ul>
                        `
                    }
                ],
            },
        ],
    };
}
