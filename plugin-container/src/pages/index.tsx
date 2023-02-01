/** @format */
import dynamic from 'next/dynamic';
import { Fragment } from 'react';

const UnityPlugin: any = dynamic(() => import('@app/components/views/unity-plugin'), { ssr: false });

const HomePage = () => {
    return (
        <Fragment>
            <main>{<UnityPlugin />}</main>
        </Fragment>
    );
};

export default HomePage;
