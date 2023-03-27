import ds from 'dawnseekers';

export default function update(state) {

    const sayHello = () => {
        ds.log('plugin says: 👋👋👋');
    };

    return {
        version: 1,
        components: [
            {
                id: 'my-hello-plugin',
                type: 'building',
                title: 'DummyBuildingGreeter',
                summary: 'Click to say hi',
                content: [
                    {
                        id: 'default',
                        type: 'popout',
                        buttons: [{ text: 'Say Hello', type: 'action', action: sayHello }],
                    },
                ],
            },
        ],
    };
}
