let UPDATE_MS = 1000;
let lastUpdated = Date.now();
let textToDisplay;

function getRandomTwoDigit() {
    return Math.floor(Math.random() * 90 + 10);
}

async function getRandomNumber() {
    const now = Date.now();
    const recentlyUpdate = now - lastUpdated < UPDATE_MS;
    if (!textToDisplay || !recentlyUpdate) {
        textToDisplay = getRandomTwoDigit().toString();
    }
    return textToDisplay.toString();
}

export default async function update() {
    const text = await getRandomNumber();
    const text2 = await getRandomNumber();
    return {
        version: 1,
        /*map: [],*/
        components: [
            {
                id: "display-building",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: `
                            <p>Are ya winnin'?</p>
                        `,
                    },
                ],
            },
        ],
    };
}
