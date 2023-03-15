import { newAsyncRuntime, QuickJSContext, QuickJSAsyncRuntime } from 'quickjs-emscripten';
import { State, ActionDispatcher } from './client';
import { StructuredLogger } from './logger';
import { stateToJSON } from './utils';

const dsapi = `
export function dispatch(name, ...args) {
    const req = JSON.stringify({ name, args });
    return globalThis.__ds.dispatch(req);
}

export function log(text, o) {
    const values = o || {};
    const req = JSON.stringify({ level: 1, text: text.toString(), values });
    return globalThis.__ds.log(req);
}

export default {
    dispatch,
    log,
};
`;

export type PluginActionCallProxy = () => Promise<void>;
export type PluginSubmitCallValues = { [key: string]: string };
export type PluginSubmitCallProxy = (values: PluginSubmitCallValues) => Promise<void>;

export type PluginStateButtonAction = {
    text: string;
    type: 'action';
    action: PluginActionCallProxy;
};

export type PluginStateButtonToggle = {
    text: string;
    type: 'toggle';
    content: string;
};

export type PluginStateButtonSubmit = {
    text: string;
    type: 'submit';
};

export type PluginStateButton = PluginStateButtonAction | PluginStateButtonToggle | PluginStateButtonSubmit;

export const PluginStateComponentContentTypes = ['popout', 'dialog', 'inline'] as const;
export type PluginStateComponentContentType = (typeof PluginStateComponentContentTypes)[number];

function isComponentContentType(maybeType: unknown): maybeType is PluginStateComponentContentType {
    return (
        typeof maybeType === 'string' &&
        PluginStateComponentContentTypes.includes(maybeType as PluginStateComponentContentType)
    );
}

export interface PluginStateComponentContent {
    id: string;
    type: PluginStateComponentContentType;
    submit?: PluginSubmitCallProxy;
    html?: string;
    buttons?: PluginStateButton[];
}

export const PluginStateComponentTypes = ['building', 'tile', 'seeker', 'nav'];
export type PluginStateComponentType = (typeof PluginStateComponentTypes)[number];

function isComponentType(maybeType: unknown): maybeType is PluginStateComponentType {
    return typeof maybeType === 'string' && PluginStateComponentTypes.includes(maybeType as PluginStateComponentType);
}

export interface PluginStateComponent {
    id: string;
    type: PluginStateComponentType;
    title?: string;
    summary?: string;
    content?: PluginStateComponentContent[];
}

export interface PluginState {
    components: PluginStateComponent[];
}

// --------------- v1 response shape

export type PluginV1SubmitValues = { [key: string]: string };
export type PluginV1ActionCallback = () => void;
export type PluginV1SubmitCallback = (values: PluginV1SubmitValues) => void;

export interface PluginV1Button {
    text?: string;
    type?: 'submit' | 'toggle' | 'action';
    action?: unknown | PluginV1ActionCallback;
    content?: never;
}

export interface PluginV1ComponentContent {
    id?: string;
    type?: 'popout' | 'dialog' | 'inline';
    submit?: unknown | PluginV1SubmitCallback;
    html?: string;
    buttons?: PluginV1Button[];
}

export interface PluginV1Component {
    id?: string;
    version?: number;
    type?: 'building' | 'tile' | 'seeker' | 'nav';
    title?: string;
    summary?: string;
    content?: PluginV1ComponentContent[];
}

export interface PluginV1Response {
    version?: 1;
    components?: PluginV1Component[];
}

export type PluginResponse = PluginV1Response;

// -----------------------

export enum PluginTrust {
    UNTRUSTED,
    TRUSTED,
}

export enum PluginType {
    CORE,
    BUILDING,
}

export interface PluginConfig {
    id: string;
    type: PluginType;
    trust: PluginTrust;
    src: string;
}

export interface InactivePlugin {
    id: string;
    src: string;
    type: PluginType;
    trust: PluginTrust;
}

export interface ActivePlugin extends InactivePlugin {
    context: QuickJSContext;
    update: (state: State) => PluginState;
}

export interface PluginSandboxConfig {
    dispatcher: ActionDispatcher;
    logger: StructuredLogger;
}

export interface PluginSandbox {
    load: (cfg: PluginConfig) => Promise<void>;
    unload: (id: string) => Promise<void>;
    getState: (state: State) => PluginState[];
}

export class QuickSandbox implements PluginSandbox {
    runtime: Promise<QuickJSAsyncRuntime>;
    runtimeLock: boolean = false;
    active: ActivePlugin[] = [];
    dispatcher: ActionDispatcher;
    logger: StructuredLogger;

    constructor(cfg: PluginSandboxConfig) {
        this.runtime = newAsyncRuntime();
        this.dispatcher = cfg.dispatcher;
        this.logger = cfg.logger;
    }

    async unload(id: string) {
        const plugin = this.active.find((p) => p.id === id);
        if (!plugin) {
            return;
        }
        plugin.context.dispose();
        this.active = this.active.filter((p) => p.id !== id);
    }

    async load({ id: pluginId, src, type: pluginType, trust }: PluginConfig) {
        // check if already loaded
        const existingPlugin = this.active.find((p) => p.id === pluginId);
        if (existingPlugin) {
            if (existingPlugin.src === src) {
                // already loaded, ignore
                return;
            }
            // src has changed, shutdown the context and remove
            existingPlugin.context.dispose();
            this.active = this.active.filter((p) => p.id !== pluginId);
        }

        // create a flag that will be check to decide if
        // the api within the plugin is enabled or not.
        //
        // the api bindings are only usable when api.enabled = true
        //
        // during execution of an event handler this is the case,
        // but during background operation and during update calls
        // the api is disabled.
        //
        // this prevents a class of undesirable activities such as
        // plugins triggering dispatch calls on load or responding
        // to state changes in update
        const api = { enabled: false };

        // create a new context
        const runtime = await this.runtime;
        // const qjs = await getQuickJS();
        // const runtime = qjs.newRuntime();
        runtime.setMemoryLimit(1024 * 640);
        runtime.setMaxStackSize(1024 * 320);
        // Interrupt computation after 1024 calls to the interrupt handler
        // let interruptCycles = 0;
        // runtime.setInterruptHandler(() => ++interruptCycles > 1024);
        const context = runtime.newContext();

        // create the global __ds object where we stick all
        // the bridging functions
        const dsHandle = context.newObject();

        // setup the dispatch binding
        context
            .newAsyncifiedFunction('dispatch', async (reqHandle) => {
                if (!api.enabled) {
                    throw new Error('ds api is unavilable outside of event handlers');
                }
                const req = JSON.parse(context.getString(reqHandle));
                if (!req || !req.name || !req.args) {
                    throw new Error(`ds.dispatch: invalid args: ${req}`);
                }
                await this.dispatcher(req.name, ...req.args);
                return context.newString('ok'); // TODO: return txid
            })
            .consume((fn: any) => context.setProp(dsHandle, 'dispatch', fn));

        // setup the log binding
        context
            .newFunction('log', (reqHandle) => {
                if (!api.enabled) {
                    throw new Error('ds api is unavilable outside of event handlers');
                }
                try {
                    const req = JSON.parse(context.getString(reqHandle));
                    this.logger.send(req);
                } catch (err) {
                    console.error(`error while attempting to deliver log message: ${err}: log data`);
                }
                return context.undefined;
            })
            .consume((fn: any) => context.setProp(dsHandle, 'log', fn));

        // attach the __ds proxy to global object
        context.setProp(context.global, '__ds', dsHandle);
        dsHandle.dispose();

        // setup the module loader for the magic imports
        runtime.setModuleLoader((moduleName) => {
            switch (moduleName) {
                case '__plugin__':
                    return src;
                case 'dawnseekers':
                    return dsapi;
                default:
                    throw new Error('importing modules is only available for dawnseekers module');
            }
        });

        // load the untrusted src via the module loader
        const ok = context.evalCode(
            `
            import update from '__plugin__';
            globalThis.__update = update;
        `
        );
        context.unwrapResult(ok).consume(context.getString);

        // setup the update func
        const updateProxy = (state: State): PluginState => {
            const res = context.evalCode(`(function(nextState){

                const res = globalThis.__update(nextState);

                // replace funcs with refs
                const refs = {};
                if (!res) {
                    res = {};
                }
                if (res.components) {
                    res.components.forEach(comp => {
                        if (!comp.content || !comp.content.forEach) {
                            return;
                        }
                        comp.content.forEach(cont => {
                            if (!cont.id) {
                                return;
                            }
                            if (typeof cont.submit === 'function') {
                                const ref = Math.random().toString(36);
                                if (refs[ref]) {
                                    throw new Error('bang, need better ref picker');
                                }
                                refs[ref] = cont.submit;
                                cont.submit = ref;
                            }
                            if (!cont.buttons || !cont.buttons.forEach) {
                                return;
                            }
                            cont.buttons.forEach((btn,idx) => {
                                if (typeof btn.action === 'function') {
                                    const ref = comp.id+'/'+cont.id+'/'+idx;
                                    if (refs[ref]) {
                                        throw new Error('bang, need better ref picker');
                                    }
                                    refs[ref] = btn.action;
                                    btn.action = ref;
                                }
                            })
                        });
                    });
                }

                // stick the refs somewhere we can find them later
                globalThis.__refs = refs;

                return JSON.stringify(res);

            })(${stateToJSON(state)})`);
            const pluginResponse = JSON.parse(context.unwrapResult(res).consume(context.getString));
            console.debug('recv', pluginResponse);
            return normalizePluginState(pluginResponse);
        };

        // setup the submit func
        const submitProxy = async (ref: string, values: PluginSubmitCallValues): Promise<void> => {
            if (api.enabled) {
                console.error('plugin unable to handle event: already handling an event for this plugin');
                return;
            }
            if (this.runtimeLock) {
                console.error('plugin unable to handle event: busy handling another plugin event');
                return;
            }
            console.log('submit', ref, values);
            try {
                api.enabled = true;
                this.runtimeLock = true;
                // TODO: THIS MUST HAVE A TIMEOUT OR THE WHOLE THING WILL BE DEADLOCKED LOCKED!!!!
                const res = await context.evalCodeAsync(`(function({ref, values}){
                    const fn = globalThis.__refs[ref];
                    fn && fn(values);
                    return JSON.stringify({ok: true});
                })(${JSON.stringify({ ref, values })})`);
                context.unwrapResult(res).consume(context.getString);
            } finally {
                api.enabled = false;
                this.runtimeLock = false;
            }
        };

        // convert plguinresponse -> pluginstate
        // normalizes multiple version responses into compatible latest
        const normalizePluginV1Buttons = ({ text, type, action, content }: PluginV1Button): PluginStateButton => {
            if (!text) {
                text = 'action';
            }
            switch (type) {
                case 'action':
                    const ref: unknown = action;
                    if (typeof ref !== 'string') {
                        throw new Error(`invalid plugin response: action should reference a function`);
                    }
                    return { text, type, action: () => submitProxy(ref, {}) };
                case 'submit':
                    return { text, type };
                case 'toggle':
                    if (typeof content !== 'string') {
                        throw new Error(
                            `invalid plugin response: content property must be a string referancing a content id`
                        );
                    }
                    return { text, type, content };
                default:
                    throw new Error(`invalid plugin response: unknown button type: ${type}`);
            }
        };
        const normalizePluginV1Content = ({
            id,
            type,
            html,
            submit,
            buttons,
        }: PluginV1ComponentContent): PluginStateComponentContent | null => {
            if (!id) {
                throw new Error(`invalid plugin response: missing content.id`);
            }
            if (!isComponentContentType(type)) {
                console.warn(`ignoring unknown component content type: ${type}`);
                return null;
            }
            const ref: unknown = submit;
            return {
                id,
                type,
                submit:
                    ref && typeof ref === 'string'
                        ? async (values: PluginSubmitCallValues) => submitProxy(ref, values)
                        : undefined,
                html,
                buttons: buttons ? buttons.map(normalizePluginV1Buttons) : [],
            };
        };
        const normalizePluginV1Component = (c: PluginV1Component, idx: number): PluginStateComponent | null => {
            const id = c.id || `${pluginId}-${idx}`;
            if (!isComponentType(c.type)) {
                return null;
            }
            return {
                id,
                type: c.type,
                title: c.title,
                summary: c.summary,
                content: c.content
                    ? c.content
                          .map(normalizePluginV1Content)
                          .filter((c): c is PluginStateComponentContent => c !== null)
                    : [],
            };
        };
        const normalizePluginState = (res: PluginResponse): PluginState => {
            return {
                components: res.components
                    ? res.components
                          .map(normalizePluginV1Component)
                          .filter((c): c is PluginStateComponent => c !== null)
                    : [],
            };
        };

        // add the plugin to the active list
        this.active.push({
            id: pluginId,
            type: pluginType,
            trust,
            src,
            update: updateProxy,
            context,
        });
    }

    getState(state: State): PluginState[] {
        return this.active.map((p) => p.update(state));
    }
}
