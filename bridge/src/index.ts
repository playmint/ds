import { Client as DawnseekersClient, State } from "../../core/dist/src/index";
import { ethers } from "ethers";
import { Observer } from "zen-observable-ts";
import "cross-fetch/polyfill";

interface Message {
    msg: string;
}

interface DispatchMessage extends Message {
    action: string;
    args: any[];
}

interface SelectTileMessage extends Message {
    tileIDs: string[];
}

interface SetIntentMessage extends Message {
    intent: string;
}

class DawnSeekersBridge implements Observer<State> {
    private _ds: DawnseekersClient;

    constructor(privKey: string) {
        this._ds = new DawnseekersClient({
            wsEndpoint: "ws://localhost:8080/query",
            httpEndpoint: "http://localhost:8080/query",
            signer: async () => {
                const key = new ethers.SigningKey(privKey);
                return new ethers.BaseWallet(key);
            },
        });

        this._ds.subscribe(this);
        this._ds
            .signin()
            .catch((e) => {
                console.log("Failed to sign in");
                console.log(e);
            })
            .then(() => {
                // aliased to keep processMessage code same between react version of this code
                const ds = this._ds;

                // Same `processMessage` func as found in `src/components/organisms/unity-map/index.tsx`
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
                            ds.dispatch(action, ...args).catch((e) => {
                                console.error(e);
                            });
                            break;
                        }
                        case "selectTiles": {
                            const { tileIDs } = msgObj as SelectTileMessage;
                            ds.selectTiles(tileIDs).catch((e) => {
                                console.error(e);
                            });
                            break;
                        }
                        case "setIntent": {
                            const { intent } = msgObj as SetIntentMessage;
                            ds.setIntent(intent).catch((e) => {
                                console.error(e);
                            });
                            break;
                        }
                        case "cancelIntent": {
                            ds.cancelIntent().catch((e) => {
                                console.error(e);
                            });
                            break;
                        }
                    }
                };

                process.stdin.on("data", (data: Buffer) => {
                    const input = data.toString("utf-8").trim();
                    if (input.length == 0) return;

                    if (echoOn) {
                        process.stdout.write("**" + input + "**\n");
                    }

                    var lines = input.split("\n");

                    lines.forEach(processMessage);
                });
            });
    }

    public next(state: State) {
        state = this.breakCircularReferences(state) as State;

        const json = JSON.stringify(state, (key, value) => {
            if (typeof value === "bigint") {
                return BigInt(value).toString(16);
            }
            return value;
        });

        process.stdout.write(json + "\n");
    }

    private breakCircularReferences(obj: any, ancestorSet?: any[]) {
        const seen: any[] = [];
        if (ancestorSet) {
            seen.push(...ancestorSet);
        }

        if (seen.indexOf(obj) > -1) {
            const idx = seen.indexOf(obj);
            return null;
        }

        seen.push(obj);

        const newObj: any = Array.isArray(obj) ? [] : {};

        for (var key in obj) {
            const value = obj[key];
            if (typeof value === "object" && value !== null) {
                const newVal = this.breakCircularReferences(value, seen);
                if (newVal !== null) {
                    newObj[key] = newVal;
                }
            } else {
                newObj[key] = obj[key];
            }
        }

        return newObj;
    }
}

const DEFAULT_PRIV_KEY =
    "0xc14c1284a5ff47ce38e2ad7a50ff89d55ca360b02cdf3756cdb457389b1da223";
const privKey = process.argv.length >= 3 ? process.argv[2] : DEFAULT_PRIV_KEY;
const echoOn = process.argv.length >= 4 ? process.argv[3] == "--echo" : false; // TODO: proper arg parsing

const bridge = new DawnSeekersBridge(privKey);
