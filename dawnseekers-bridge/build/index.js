"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const host_1 = require("./ds-client/host");
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const ws_1 = __importDefault(require("ws"));
class DawnSeekersBridge {
    constructor(privKey) {
        this._ds = new host_1.DawnseekersClient({
            wsEndpoint: "ws://localhost:8080/query",
            httpEndpoint: "http://localhost:8080/query",
            autoloadablePlugins: [
                // this would be fetched from cog-services
                {
                    type: host_1.PluginType.BUILDING,
                    trust: host_1.PluginTrust.UNTRUSTED,
                    addr: "my-building-kind-addr",
                    src: ``,
                },
            ],
            corePlugins: [],
            fetch: cross_fetch_1.default,
            webSocketImpl: ws_1.default,
            privKey,
        });
        this._ds.subscribe(this);
        this.signin();
        process.stdin.on("data", (data) => {
            const json = data.toString("utf-8");
            try {
                const msgObj = JSON.parse(json);
                if (msgObj.msg === "dispatch") {
                    const { action, args } = msgObj;
                    this._ds.dispatch(action, ...args);
                }
                if (msgObj.msg === "selectTile") {
                    const { tileIDs } = msgObj;
                    this._ds.selectTiles(tileIDs);
                }
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    async signin() {
        await this._ds.signin();
    }
    next(state) {
        state = this.breakCircularReferences(state);
        const json = JSON.stringify(state, (key, value) => {
            if (typeof value === "bigint") {
                return "0x" + BigInt(value).toString(16);
            }
            return value;
        });
        process.stdout.write(json + "\n");
    }
    breakCircularReferences(obj, ancestorSet) {
        const seen = [];
        if (ancestorSet) {
            seen.push(...ancestorSet);
        }
        if (seen.indexOf(obj) > -1) {
            const idx = seen.indexOf(obj);
            return null;
        }
        seen.push(obj);
        const newObj = Array.isArray(obj) ? [] : {};
        for (var key in obj) {
            const value = obj[key];
            if (typeof value === "object" && value !== null) {
                const newVal = this.breakCircularReferences(value, seen);
                if (newVal !== null) {
                    newObj[key] = newVal;
                }
            }
            else {
                newObj[key] = obj[key];
            }
        }
        return newObj;
    }
    simpleBreakCircularReferences(obj) {
        for (let key in obj) {
            obj[key] = JSON.parse(JSON.stringify(obj[key], this.getCircularReplacer()));
        }
        return obj;
    }
    getCircularReplacer() {
        const seen = new WeakSet();
        return (key, value) => {
            if (typeof value === "bigint") {
                return "0x" + BigInt(value).toString(16);
            }
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
            }
            return value;
        };
    }
}
const DEFAULT_PRIV_KEY = "0xc14c1284a5ff47ce38e2ad7a50ff89d55ca360b02cdf3756cdb457389b1da223";
const privKey = process.argv.length >= 3 ? process.argv[2] : DEFAULT_PRIV_KEY;
const bridge = new DawnSeekersBridge(privKey);
