import fetch from "cross-fetch";
import {
    tap,
    filter,
    take,
    skipWhile,
    pipe,
    subscribe,
    toPromise,
} from "wonka";
import WebSocket from "ws";
import {
    ActionName,
    ConnectedPlayer,
    GameState,
    makeCogClient,
    makeConnectedPlayer,
    makeGameState,
    makeKeyWallet,
    makeLogger,
    makeSelection,
    makeWorld,
} from "@downstream/core";

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

async function main(privKey: string, echoOn: boolean) {
    const initialConfig = {
        wsEndpoint: "ws://localhost:8080/query",
        wsSocketImpl: WebSocket,
        httpEndpoint: "http://localhost:8080/query",
        httpFetchImpl: fetch,
    };

    const wallet = makeKeyWallet(privKey);
    const { client, setConfig } = makeCogClient(initialConfig);
    const { logger } = makeLogger({ name: "main" });
    const player = makeConnectedPlayer(client, wallet, logger);
    const world = makeWorld(client);
    const { selection, ...selectors } = makeSelection(client, world, player);
    const { selectTiles, selectIntent, selectMobileUnit, selectMapElement } = selectors;
    const game = makeGameState(player, world, selection, selectTiles, selectMobileUnit, selectIntent, selectMapElement);
    const { stdout, stdin } = process;

    const { dispatch } = (await pipe(
        player,
        skipWhile((p): p is ConnectedPlayer => typeof p === "undefined"),
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
            case "dispatch": {
                const { action, args } = msgObj as DispatchMessage;
                dispatch({ name: action, args });
                break;
            }
            case "selectTiles": {
                const { tileIDs } = msgObj as SelectTileMessage;
                selectTiles(tileIDs);
                break;
            }
            case "setIntent": {
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
        process.stdout.write(JSON.stringify(game) + "\n");
    };

    stdin.on("data", (data: Buffer) => {
        const input = data.toString("utf-8").trim();
        if (input.length == 0) return;

        if (echoOn) {
            process.stdout.write("**" + input + "**\n");
        }

        var lines = input.split("\n");

        lines.forEach(processMessage);
    });

    pipe(game, subscribe(onGameStateUpdate));
}

if (require.main === module) {
    const DEFAULT_PRIV_KEY =
        "0xc14c1284a5ff47ce38e2ad7a50ff89d55ca360b02cdf3756cdb457389b1da223";
    const privKey =
        process.argv.length >= 3 ? process.argv[2] : DEFAULT_PRIV_KEY;
    const echoOn =
        process.argv.length >= 4 ? process.argv[3] == "--echo" : false; // TODO: proper arg parsing
    main(privKey, echoOn).catch((error) =>
        console.error(JSON.stringify({ error }))
    );
}
