import {
    ActionName,
    ConnectedPlayer,
    GameState,
    makeConnectedPlayer,
    makeGameState,
    makeKeyWallet,
    makeLogger,
    makeSelection,
    makeWorld,
} from '@downstream/core';
import { pipe, skipWhile, subscribe, take, toPromise } from 'wonka';

const DEFAULT_UNITY_KEY = '0xc14c1284a5ff47ce38e2ad7a50ff89d55ca360b02cdf3756cdb457389b1da223';

interface Message {
    msg: string;
}

interface DispatchMessage extends Message {
    action: ActionName;
    args: any[];
}

interface SelectTileMessage extends Message {
    tileIDs: string[];
}

interface SetIntentMessage extends Message {
    intent: string;
}

interface SetMobileUnitMessage extends Message {
    mobileUnitID: string;
}

interface SetMapElementMessage extends Message {
    mapElementID: string;
}

async function start(ctx) {
    const { logger } = makeLogger({ name: 'main' });
    const { client } = ctx.makeClient();
    const wallet = makeKeyWallet(ctx.k ? (ctx.k.startsWith('0x') ? ctx.k : `0x${ctx.k}`) : DEFAULT_UNITY_KEY);
    const player = makeConnectedPlayer(client, wallet, logger);
    const world = makeWorld(client);
    const { selection, ...selectors } = makeSelection(client, world, player);
    const { selectTiles, selectIntent, selectMobileUnit, selectMapElement } = selectors;
    const game = makeGameState(player, world, selection, selectTiles, selectMobileUnit, selectIntent, selectMapElement);

    const { dispatch } = (await pipe(
        player,
        skipWhile((p): p is ConnectedPlayer => typeof p === 'undefined'),
        take(1),
        toPromise
    )) as ConnectedPlayer;

    const processMessage = (msgJson: any) => {
        let msgObj: Message;
        try {
            msgObj = JSON.parse(msgJson) as Message;
        } catch (e) {
            console.error(e);
            return;
        }

        switch (msgObj.msg) {
            case 'dispatch': {
                const { action, args } = msgObj as DispatchMessage;
                dispatch({ name: action, args });
                break;
            }
            case 'selectTiles': {
                const { tileIDs } = msgObj as SelectTileMessage;
                selectTiles(tileIDs);
                break;
            }
            case 'setIntent': {
                const { intent } = msgObj as SetIntentMessage;
                selectIntent(intent);
                break;
            }
            case 'selectMobileUnit': {
                const { mobileUnitID } = msgObj as SetMobileUnitMessage;
                selectMobileUnit(mobileUnitID);
                break;
            }
            case 'selectMapElement': {
                const { mapElementID } = msgObj as SetMapElementMessage;
                selectMapElement(mapElementID);
                break;
            }
        }
    };

    const onGameStateUpdate = (game: Partial<GameState>) => {
        process.stdout.write(JSON.stringify(game) + '\n');
    };

    process.stdin.on('data', (data: Buffer) => {
        const input = data.toString('utf-8').trim();
        if (input.length == 0) return;

        if (ctx.echo) {
            process.stdout.write('**' + input + '**\n');
        }

        const lines = input.split('\n');

        lines.forEach(processMessage);
    });

    pipe(game, subscribe(onGameStateUpdate));
}

export const bridge = {
    command: 'unity-bridge',
    describe: 'start the unity dev server bridge',
    builder: (cli) => {
        cli.option('echo', { describe: 'echo input', type: 'boolean' });
    },
    handler: async (ctx) => {
        await start(ctx);
        return sleep(999999999);
    },
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default bridge;
