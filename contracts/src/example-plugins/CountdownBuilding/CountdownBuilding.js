let startTime;
let endTime;

async function getRemainingTime() {
    const now = Date.now();
    if(!startTime || !endTime || now>endTime)
    {
        startTime = now+5000;
        endTime = now + 65000;
    }
    return [startTime, endTime];
}

export default async function update() {
    const [start, end] = await getRemainingTime();
    
    return {
        version: 1,
        map: [
            {
                type: "building",
                id: "0x34cf8a7e000000000000000000000000000000010000ffff",
                key: "countdown-start",
                value: {start},
            },
            {
                type: "building",
                id: "0x34cf8a7e000000000000000000000000000000010000ffff",
                key: "countdown-end",
                value: {end},
            },
        ],
        components: [
            {
                id: "countdown-building",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: `
                            <p>Counting down!</p>
                        `,
                    },
                ],
            },
        ],
    };
}
