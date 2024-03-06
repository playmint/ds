import ds from 'downstream';


export default async function update({ selected, world, player }) {

    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'apex',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `
                            The buildings of tomorrow can be fabricated here.
                            <ul style="padding-left: 30px;">
                            <li><a href="/building-fabricator">Building Fabricator</a></li>
                            </ul>
                        `
                    }
                ],
            },
        ],
    };
}
