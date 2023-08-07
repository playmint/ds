import {
    ConnectedPlayer,
    EthereumProvider,
    makeConnectedPlayer,
    makeKeyWallet,
    makeLogger,
    makeWallet,
} from '@downstream/core';
import { EthereumProvider as WalletConnectProvider } from '@walletconnect/ethereum-provider';
import fetch from 'cross-fetch';
import qrcode from 'qrcode-terminal';
import { pipe, skipWhile, take, toPromise } from 'wonka';
import WebSocket from 'ws';

import { makeCogClient } from '@downstream/core';
import { networks } from '../utils/networks';

const newWalletConnectProvider = async (): Promise<EthereumProvider> => {
    const wc = await WalletConnectProvider.init({
        projectId: '0061224af3af75d7af2bbfa60d3c49c3',
        chains: [1],
        showQrModal: false,
        metadata: {
            name: 'Downstream',
            description: 'downstream',
            url: 'https://downstream.game/',
            icons: [''],
        },
    });
    return new Promise((resolve, reject) => {
        const onDisplayURI = (uri: string) => {
            qrcode.generate(uri, { small: true }, (qr) => {
                console.clear();
                console.log(qr);
            });
        };
        const onConnect = (_info) => {
            console.clear();
            resolve(wc);
        };
        wc.on('display_uri', onDisplayURI);
        wc.on('connect', onConnect);
        wc.connect().catch(reject);
    });
};

export const session = async (argv) => {
    const network = networks.find((n) => n.name == argv.network);
    if (!network) {
        throw new Error(`no network found with name ${argv.network}`);
    }

    let __client: ReturnType<typeof makeCogClient>;
    const makeClient = () => {
        if (__client) {
            return __client;
        }
        const client = makeCogClient({
            wsEndpoint: network.wsEndpoint,
            wsSocketImpl: WebSocket,
            httpEndpoint: network.httpEndpoint,
            httpFetchImpl: fetch,
        });
        __client = client;
        return __client;
    };

    const getPlayerSession = async () => {
        const { logger } = makeLogger({ name: 'main' });
        const { client } = makeClient();
        if (argv.k) {
            const wallet = makeKeyWallet(`0x${argv.k}`);
            const player = pipe(
                makeConnectedPlayer(client, wallet, logger),
                skipWhile((p): p is ConnectedPlayer => typeof p === 'undefined'),
                take(1),
                toPromise
            );
            const p = await player;
            if (!p) {
                throw new Error(`no player`);
            }
            await p.login();
            return p;
        } else {
            const { wallet, selectProvider } = makeWallet();
            const player = pipe(
                makeConnectedPlayer(client, wallet, logger),
                skipWhile((p): p is ConnectedPlayer => typeof p === 'undefined'),
                take(1),
                toPromise
            );
            const provider = await newWalletConnectProvider();
            selectProvider(provider);
            await sleep(1000); // seems to be a bit of an eventual consistency race outside our control on the walletconnect api side
            // await provider.request({ method: 'eth_accounts' }); // check connection or explode
            const p = await player;
            if (!p) {
                throw new Error(`no player`);
            }
            await p.login();
            return p;
        }
    };

    argv.game = 'DOWNSTREAM';
    argv.client = async () => {
        const { client } = makeClient();
        return pipe(client, take(1), toPromise);
    };

    let __player: Awaited<ReturnType<typeof getPlayerSession>>;
    argv.player = async () => {
        if (__player) {
            return __player;
        }
        __player = await getPlayerSession();
        if (!__player) {
            throw new Error('failed to get player');
        }
        return __player;
    };
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
