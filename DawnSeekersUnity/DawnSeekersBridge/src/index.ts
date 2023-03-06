import { inspect } from 'util';
import { DawnseekersClient, Tile, State, PluginTrust, PluginType, useDawnseekersState, BiomeKind } from '../lib/exp-ds-worker-client/src/host';
import fetch from 'cross-fetch';
import WebSocket from 'ws';
import { Observer } from 'zen-observable-ts';

class DawnSeekersBridge implements Observer<State> {

    private _ds: DawnseekersClient;

    constructor() {
        this._ds = new DawnseekersClient({
            wsEndpoint: 'ws://localhost:8080/query',
            httpEndpoint: 'http://localhost:8080/query',
            autoloadablePlugins: [
                // this would be fetched from cog-services
                {
                    type: PluginType.BUILDING,
                    trust: PluginTrust.UNTRUSTED,
                    addr: 'my-building-kind-addr',
                    src: ``,
                },
            ],
            corePlugins: [],
            fetch,
            webSocketImpl: WebSocket
        });

        this._ds.subscribe(this);
    }

    public next(state: State) {
        // Break circular references
        for (let key in state) {
            state[key] = this.clean(state[key]);
        }

        const json = JSON.stringify(state);
        process.stdout.write(json + '\n');
    }

    private clean(obj: any) {
        for (let key in obj) {
            obj[key] = JSON.parse(JSON.stringify(obj[key], this.getCircularReplacer()));
        }

        return obj;
    }

    private getCircularReplacer() {
        const seen = new WeakSet();
        return (key, value) => {

            if (typeof value === 'bigint') {
                return "0x" + BigInt(value).toString(16);
            }

            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
            }

            return value;
        };
    };
}

const bridge = new DawnSeekersBridge();