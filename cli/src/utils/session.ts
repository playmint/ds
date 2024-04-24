import {
    ConnectedPlayer,
    EthereumProvider,
    LogLevel,
    NodeSelectors,
    makeConnectedPlayer,
    makeKeyWallet,
    makeKeylessWallet,
    makeLogger,
    makeWallet,
} from '@downstream/core';
import { EthereumProvider as WalletConnectProvider } from '@walletconnect/ethereum-provider';
import fetch from 'cross-fetch';
import qrcode from 'qrcode-terminal';
import { pipe, skipWhile, take, toPromise } from 'wonka';
import WebSocket from 'ws';
import { authenticate } from './auth';
import { ethers } from 'ethers';

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
                console.log(`\n`);
                console.log(qr);
                console.log(`

█▀▀▄ █▀▀█ █───█ █▀▀▄ █▀▀ ▀▀█▀▀ █▀▀█ █▀▀ █▀▀█ █▀▄▀█
█──█ █──█ █▄█▄█ █──█ ▀▀█ ──█── █▄▄▀ █▀▀ █▄▄█ █─▀─█
▀▀▀─ ▀▀▀▀ ─▀─▀─ ▀──▀ ▀▀▀ ──▀── ▀─▀▀ ▀▀▀ ▀──▀ ▀───▀
`);
                console.log(`\n`);
                console.log(`Authorization required to continue...`);
                console.log(`\n`);
                console.log(
                    `Please scan the QR code with your mobile wallet to connect, you will be prompted to sign a message to authenticate your Downstream session`
                );
                console.log(`\n`);
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

export const session = async (ctx) => {
    const network = networks.find((n) => n.name == ctx.network);
    if (!network) {
        throw new Error(`no network found with name ${ctx.network}`);
    }

    // if a full id is provided, convert to the small key/id
    ctx.zone = (ctx.zone || '').startsWith(NodeSelectors.Zone)
        ? Number(BigInt.asIntN(16, BigInt(ctx.zone.replace(NodeSelectors.Zone, '0x'))))
        : ctx.zone || 0;

    let __client: ReturnType<typeof makeCogClient>;
    ctx.makeClient = () => {
        if (__client) {
            return __client;
        }
        const client = makeCogClient({
            wsEndpoint: ctx.wsEndpoint || network.wsEndpoint,
            wsSocketImpl: WebSocket,
            httpEndpoint: ctx.httpEndpoint || network.httpEndpoint,
            httpFetchImpl: fetch,
        });
        __client = client;
        return __client;
    };

    const getPlayerSession = async () => {
        const { logger } = makeLogger({ name: 'main', level: LogLevel.FATAL });
        const { client } = ctx.makeClient();
        if (ctx.k) {
            const wallet = makeKeyWallet(ctx.k.startsWith('0x') ? ctx.k : `0x${ctx.k}`);
            const player = pipe(
                makeConnectedPlayer(client, wallet, logger, ctx.zone || 0),
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
        } else if (ctx.wallet === 'metamask') {
            const session = await authenticate(network.loginEndpoint);
            const wallet = makeKeylessWallet(session.owner);
            const player = pipe(
                makeConnectedPlayer(client, wallet, logger, ctx.zone || 0),
                take(1),
                toPromise
            );
            const p = await player;
            if (!p) {
                throw new Error('authentication failure: unable to setup player, maybe try again');
            }
            await p.load(new ethers.Wallet(session.key), session.expires)
            console.log(`authenticated as player ${session.owner}`);
            return p;
        } else if (ctx.wallet === 'walletconnect') {
            const { wallet, selectProvider } = makeWallet();
            const player = pipe(
                makeConnectedPlayer(client, wallet, logger, ctx.zone || 0),
                skipWhile((p): p is ConnectedPlayer => typeof p === 'undefined'),
                take(1),
                toPromise
            );
            const provider = await Promise.race([newWalletConnectProvider(), sleep(60 * 1000).then(() => null)]);
            if (provider === null) {
                throw new Error('Timed out waiting for walletconnect connection or approval, please try again');
            }
            selectProvider({ method: 'walletconnect', provider });
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

    ctx.game = 'DOWNSTREAM';
    ctx.client = async () => {
        const { client } = ctx.makeClient();
        return pipe(client, take(1), toPromise);
    };

    let __player: Awaited<ReturnType<typeof getPlayerSession>>;
    ctx.player = async () => {
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
