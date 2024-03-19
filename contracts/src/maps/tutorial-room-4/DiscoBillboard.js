import ds from 'downstream';

// TODO: change these to beaver dancing images
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

const changeImg = () => {
    selectedImg = (selectedImg + 1) % images.length;
};

export default async function update(state) {

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
        action: changeImg,
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
                        html: ``,
                        buttons: buttons,
                    },
                ],
            },
        ],
    };
}

function getMobileUnit(state) {
    return state?.selected?.mobileUnit;
}

function logState(state) {
    console.log('State sent to pluging:', state);
}

// the source for this code is on github where you can find other example buildings:
// https://github.com/playmint/ds/tree/main/contracts/src/example-plugins