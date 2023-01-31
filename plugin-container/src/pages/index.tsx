/** @format */
import { useCogPlugin } from '@app/contexts/cog-plugin-provider';
import { Anchor } from '@app/types/anchor';
import dynamic from 'next/dynamic';
import { Fragment, useEffect } from 'react';

const UnityPlugin: any = dynamic(() => import('@app/components/views/unity-plugin'), { ssr: false });

const HomePage = () => {
    const { isReady, registerPlugin, broadcastMessage } = useCogPlugin();

    // -- Register plugin
    useEffect(() => {
        registerPlugin(500, 500, Anchor.BottomRight);
    }, []);

    // -- Messages from shell
    useEffect(() => {
        const handleMessage = (message: any) => {
            // console.log(`message: `, message);
            const { method, args } = message.data;
            switch (method) {
                case 'MSG_HELLO_CLICK':
                    console.log('Unity plugin container received hello click');
                    break;
            }
        };

        window.addEventListener('message', handleMessage);

        return () => window.removeEventListener('message', handleMessage);
    });

    return (
        <Fragment>
            <main>{<UnityPlugin />}</main>
        </Fragment>
    );
};

export default HomePage;
