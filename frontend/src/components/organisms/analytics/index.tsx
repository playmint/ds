import Script from 'next/script';
import { id } from 'ethers';

export type TrackFunc = (name: string, params: { [key: string]: string }) => void;

export const trackEvent: TrackFunc = (name, params) => {
    const gtag = (window as any).gtag;
    if (!gtag) {
        return;
    }
    gtag('event', name, params);
};

export const trackPlayer = (address?: string) => {
    const gtag = (window as any).gtag;
    if (!gtag) {
        return;
    }
    if (!address) {
        return;
    }
    // even though addresses are public data, they are still potentially PII,
    // and even if you think they are not on their own, there is no good reason
    // to make it easy for google to tie the address to any other data
    // collected that so hash it to anonymise it then replace the 0x so that
    // google analytics doesn't treat it as a number
    const obfuscatedAddr = id(`player:${address}`).replace(/^0x/, 'p');
    gtag('set', 'user_id', obfuscatedAddr);
};

export const Analytics = ({ id }: { id: string }) => {
    return (
        <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />
            <Script id="google-analytics">{`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${id}');
                window.gtag = gtag;
            `}</Script>
        </>
    );
};

export default Analytics;
