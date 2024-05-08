// ///////////////////////////////////////
// snowsphere is the opposite of sandbox
//
// it is completely insecure!
//
// plugins executed with snowsphere has unrestricted
// access to basically everything.
//
// they can read your indexdb
// they can look at your cookies
// they can start workers
// they can request stuff as if they are the origin
// they can probably steal the session key
// they can probably get access to the DOM if they try hard enough
// they can probably turn up at your house
//
// basically this offers no protection whatsoever
//
// but ... they are fast
// and they can use the normal debugging instrumentation
// so that's nice
//
// ////////////////////////////////////////
//
import {
    GameConfig,
    GameStatePlugin,
    Logger,
    PluginConfig,
    PluginDispatchFunc,
    PluginUpdateResponse,
    Sandbox,
    actionArgFromUnknown,
} from '@downstream/core';
import * as Comlink from 'comlink';
import { ethers } from 'ethers';

let globalPluginState: GameStatePlugin;
let globalPluginBlock: number = 0;
let globalConfig: Partial<GameConfig> = {};
let globalContextSeq = 1;
const contexts: Map<number, PluginContext> = new Map();

type PluginModule = { default: (s: GameStatePlugin, block: number) => any | Promise<any> };

function esm(raw: ReturnType<typeof String.raw>, ...vals: any[]) {
    return URL.createObjectURL(new Blob([String.raw({ raw }, ...vals)], { type: 'application/javascript' }));
}

class PluginContext {
    __module: PluginModule;
    __refs: { [key: string]: (values: any) => void };

    constructor({ mod }: { mod: PluginModule }) {
        this.__module = mod;
        this.__refs = {};
    }

    async update(): Promise<PluginUpdateResponse> {
        if (!globalPluginState) {
            throw new Error('no state set yet');
        }
        let res = await Promise.resolve(this.__module.default(globalPluginState, globalPluginBlock));
        if (!res) {
            res = {};
        }
        if (res.components) {
            res.components.forEach((comp) => {
                if (!comp.content || !comp.content.forEach) {
                    return;
                }
                comp.content.forEach((cont) => {
                    if (!cont.id) {
                        return;
                    }
                    if (typeof cont.submit === 'function') {
                        const ref = comp.id + '/' + cont.id + '/submit';
                        this.__refs[ref] = cont.submit;
                        cont.submit = ref;
                    }
                    if (!cont.buttons || !cont.buttons.forEach) {
                        return;
                    }
                    cont.buttons.forEach((btn, idx) => {
                        if (typeof btn.action === 'function') {
                            const ref = comp.id + '/' + cont.id + '/' + idx;
                            this.__refs[ref] = btn.action;
                            btn.action = ref;
                        }
                    });
                });
            });
        }

        return res;
    }

    async submit({ ref, values }: { ref: string; values: any }): Promise<void> {
        const fn = this.__refs[ref];

        fn && fn(values);
    }
}

async function init(cfg: Partial<GameConfig>) {
    globalConfig = cfg;
}

async function setState(newState: GameStatePlugin, newBlock: number) {
    globalPluginState = newState;
    globalPluginBlock = newBlock;
}

async function deleteContext(id: number) {
    contexts.delete(id);
}

async function hasContext(id: number) {
    return contexts.has(id);
}

// strip imports and inject the "ds" module into scope
function rewriteModuleCode(code: string): string {
    code = code.replace(/\s*import.+from.*$/gm, '');
    code = `
        let ds = {config: ${JSON.stringify(globalConfig)}};
        export function __setDS(o) {
            ds = o;
        }
        ${code}
    `;
    return code;
}

async function newContext(
    dispatch: PluginDispatchFunc,
    logMessage: Logger,
    questMessage: Logger,
    config: PluginConfig
): Promise<number> {
    const id = ++globalContextSeq;
    const code = rewriteModuleCode(config.src);
    const mod = await import(/*webpackIgnore: true*/ esm(code));

    // all the stuff available via ds.etc
    mod.__setDS({
        dispatch(...actions: any[]) {
            try {
                if (typeof actions === 'undefined' || !Array.isArray(actions)) {
                    console.warn(`plugin-${config.id}: invalid dispatch call`, actions);
                    return;
                }
                dispatch(config.id, ...actions)
                    .then(() => console.log(`plugin-${config.id}: dispatched`, actions))
                    .catch((err) => console.error(`plugin-${config.id}: failed dispatch: ${err}`));
                return 'ok'; // TODO: return queue id
            } catch (err) {
                console.error(`plugin-${config.id}: failure attempting to dispatch: ${err}`);
                return;
            }
        },

        encodeCall(...req: any[]) {
            try {
                const [funcsig, args] = req;
                const callInterface = new ethers.Interface([funcsig]);
                const callFunc = callInterface.getFunction(funcsig);
                if (!callFunc) {
                    throw new Error(`no func found for signature ${funcsig}`);
                }
                const callArgs = callFunc.inputs.map((wanted, idx) => actionArgFromUnknown(wanted, args[idx]));
                const callData = callInterface.encodeFunctionData(callFunc.name, callArgs);
                return callData;
            } catch (err) {
                console.error(`plugin-${config.id}: failure attempting to encodeCall: ${err}`);
                return;
            }
        },

        log(...args: any[]) {
            try {
                logMessage.log(...args);
            } catch (err) {
                console.error(`plugin-${config.id}: error while attempting to deliver log message: ${err}`);
            }
            return;
        },

        sendQuestMessage(...args: any[]) {
            try {
                const [message] = args;
                questMessage.log(message);
            } catch (err) {
                console.error(`plugin-${config.id}: error while attempting to send quest message: ${err}`);
            }
            return context;
        },

        solidityPackedKeccak256(...args: any[]) {
            const [types, values] = args;
            return ethers.solidityPackedKeccak256(types, values);
        },

        keccak256(...args: any[]) {
            const [bytesHex] = args;
            return ethers.keccak256(bytesHex);
        },

        abiEncode(...args: any[]) {
            const [types, values] = args;
            const coder = ethers.AbiCoder.defaultAbiCoder();
            return coder.encode(types, values);
        },

        abiDecode(...args: any[]) {
            const [types, data] = args;
            const coder = ethers.AbiCoder.defaultAbiCoder();
            return coder.decode(types, data);
        },

        config: globalConfig,
    });

    const context = new PluginContext({ mod });
    contexts.set(id, context);
    return id;
}

async function submit(id: number, data: { ref: string; values: any }): Promise<void> {
    const context = contexts.get(id);
    if (!context) {
        return;
    }
    return context.submit(data);
}

async function update(id: number): Promise<PluginUpdateResponse> {
    const context = contexts.get(id);
    if (!context) {
        throw new Error(`no context with id=${id}`);
    }
    return context.update();
}

const sandbox: Sandbox = { init, newContext, deleteContext, hasContext, setState, update, submit };

Comlink.expose(sandbox);
