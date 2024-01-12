let UPDATE_MS = 1000;
let lastUpdated = Date.now();
let textToDisplay;

function getRandomTwoDigit() {
    return Math.floor(Math.random() * 90 + 10);
}

async function getRandomNumber() {
    console.log("UPDATING DISPLAY BUILDING");
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
        map: [
            {
                type: "building",
                id: "0x34cf8a7e000000000000000000000000000000020000fffe",
                key: "labelText",
                value: `${text}`,
            },
            {
                type: "building",
                id: "0x34cf8a7e000000000000000000000000000000030000fffd",
                key: "labelText",
                value: `${text2}`,
            },
        ],
        components: [
            {
                id: "display-building",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: `
                            <p>We supply the best drinks in Hexwood!</p>
                        `,
                    },
                ],
            },
        ],
    };
}
