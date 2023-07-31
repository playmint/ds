import {
    ConnectedPlayer,
    DOWNSTREAM_GAME_ACTIONS,
    EthereumProvider,
    makeConnectedPlayer,
    makeLogger,
    makeWallet,
} from '@downstream/core';
import { EthereumProvider as WalletConnectProvider } from '@walletconnect/ethereum-provider';
import { toPromise, pipe, take, skipWhile } from 'wonka';
import qrcode from 'qrcode-terminal';

const list = {
    command: 'list',
    aliases: ['ls'],
    describe: 'list actions',
    handler: async (ctx) => {
        const actions: any = [];
        DOWNSTREAM_GAME_ACTIONS.forEachFunction((fragment) => {
            actions.push({
                name: fragment.name,
                args:
                    ctx.format === 'table'
                        ? fragment.inputs.map(({ name, type }) => `${type} ${name}`).join(', ')
                        : fragment.inputs.map(({ name, type }) => ({ name, type })),
            });
        });
        ctx.output.write(actions);
    },
};

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

const dispatch = {
    command: 'dispatch <action> <arguments>',
    aliases: ['despatch', 'exec'],
    describe: 'dispatch an action',
    builder: (yargs) =>
        yargs
            .positional('action', { describe: 'name of action', type: 'string' })
            .positional('arguments', { describe: 'JSON array of arguments to action', type: 'string' })
            .demand(['arguments', 'action']),
    handler: async (ctx) => {
        const { logger } = makeLogger({ name: 'main' });
        const { wallet, selectProvider } = makeWallet();
        const player = pipe(
            makeConnectedPlayer(ctx.clients, wallet, logger),
            skipWhile((p): p is ConnectedPlayer => typeof p === 'undefined'),
            take(1),
            toPromise
        );
        const provider = await newWalletConnectProvider();
        selectProvider(provider);
        await sleep(1000);
        await provider.request({ method: 'eth_accounts' }); // forces connection
        const p = await player;
        if (!p) {
            throw new Error(`no player`);
        }
        await p.login();
        const res = await p.dispatch({
            name: ctx.action,
            args: JSON.parse(ctx.arguments),
        });
        ctx.output.write(res);
        process.exit(0);
    },
};

export const action = {
    command: 'actions',
    aliases: ['action'],
    describe: 'list/dispatch actions',
    builder: (yargs) => yargs.command(list).command(dispatch).demandCommand(),
};

export default action;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
