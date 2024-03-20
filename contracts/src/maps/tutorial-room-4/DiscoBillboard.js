import ds from 'downstream';

const images = [
'https://assets.downstream.game/examples/disco-beaver-0.jpeg',
'https://assets.downstream.game/examples/disco-beaver-1.jpeg',
'https://assets.downstream.game/examples/disco-beaver-2.jpeg',
'https://assets.downstream.game/examples/disco-beaver-3.jpeg',
'https://assets.downstream.game/examples/disco-beaver-4.jpeg',
'https://assets.downstream.game/examples/disco-beaver-5.jpeg',
'https://assets.downstream.game/examples/disco-beaver-6.jpeg',
'https://assets.downstream.game/examples/disco-beaver-7.jpeg',
];
let selectedImg = 1;
let blockWhenLastChanged = 0;
const WAIT_BLOCKS_TO_AUTO_CHANGE = 5;

const changeImg = (block) => {
    selectedImg = (selectedImg + 1) % images.length;
    blockWhenLastChanged = block;
};

export default async function update(state, block) {

    if (blockWhenLastChanged == 0){
        blockWhenLastChanged = block;
    }

    if (block > blockWhenLastChanged + WAIT_BLOCKS_TO_AUTO_CHANGE){
        changeImg(block);
    }

    const discoBillboard = state.world?.buildings.find(
        (b) => b.kind?.name?.value == "Disco Billboard",
    );

    if (!discoBillboard){
        return;
    }

    const map = [];
    const buttons = [];

    map.push(
        {
        type: "building",
        key: "image",
        id: `${discoBillboard.id}`,
        value: images[selectedImg],
        },
    );

    buttons.push({
        text: `Change Billboard Image 🔄`,
        type: 'action',
        action: () => changeImg(block),
        disabled: false,
    });

    return {
        version: 1,
        map: map,
        components: [
            {
                id: 'disco-billboard',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `
                            <h3>Now Showing:</h3>
                            <img src="${images[selectedImg]}" alt="Current Billboard Image">
                            [${selectedImg + 1}/${images.length}]
                        `,
                        buttons: buttons,
                    },
                ],
            },
        ],
    };
}

// the source for this code is on github where you can find other example buildings:
// https://github.com/playmint/ds/tree/main/contracts/src/example-plugins