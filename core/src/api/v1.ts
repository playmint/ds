import {
    PluginState,
    PluginStateButton,
    PluginStateComponentContent,
    PluginStateComponent,
    PluginSubmitCallValues,
    PluginSubmitProxy,
    isComponentContentType,
    isComponentType,
} from '../types';
export type PluginV1SubmitValues = { [key: string]: string };
export type PluginV1ActionCallback = () => void;
export type PluginV1SubmitCallback = (values: PluginV1SubmitValues) => void;

export interface PluginV1Metadata {
    name: string;
    src: string;
}

export interface PluginV1Button {
    text?: string;
    type?: 'submit' | 'toggle' | 'action';
    disabled?: boolean;
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
    type?: 'building' | 'tile' | 'mobileUnit' | 'nav';
    title?: string;
    summary?: string;
    content?: PluginV1ComponentContent[];
}

export interface PluginV1Response {
    version?: 1;
    components?: PluginV1Component[];
}

export type PluginResponse = PluginV1Response;

// convert plguinresponse -> pluginstate
// normalizes multiple version responses into compatible latest
function normalizePluginV1Buttons(
    { text, type, action, content, disabled }: PluginV1Button,
    submitProxy: PluginSubmitProxy,
): PluginStateButton {
    if (!text) {
        text = 'action';
    }
    switch (type) {
        case 'action':
            const ref: unknown = action;
            if (typeof ref !== 'string') {
                throw new Error(`invalid plugin response: action should reference a function`);
            }
            return { text, type, disabled, action: () => submitProxy(ref, {}) };
        case 'submit':
            return { text, type, disabled };
        case 'toggle':
            if (typeof content !== 'string') {
                throw new Error(`invalid plugin response: content property must be a string referancing a content id`);
            }
            return { text, type, disabled, content };
        default:
            throw new Error(`invalid plugin response: unknown button type: ${type}`);
    }
}

function normalizePluginV1Content(
    { id, type, html, submit, buttons }: PluginV1ComponentContent,
    submitProxy: PluginSubmitProxy,
): PluginStateComponentContent | null {
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
        buttons: buttons ? buttons.map((btn) => normalizePluginV1Buttons(btn, submitProxy)) : [],
    };
}

function normalizePluginV1Component(c: PluginV1Component, submitProxy: PluginSubmitProxy): PluginStateComponent | null {
    if (!c.id) {
        throw new Error('invalid plugin response: missing component.id');
    }
    if (!isComponentType(c.type)) {
        return null;
    }
    return {
        id: c.id,
        type: c.type,
        title: c.title,
        summary: c.summary,
        content: c.content
            ? c.content
                  .map((c) => normalizePluginV1Content(c, submitProxy))
                  .filter((c): c is PluginStateComponentContent => c !== null)
            : [],
    };
}

export function normalizePluginState(res: PluginResponse, submitProxy: PluginSubmitProxy): PluginState {
    return {
        components: res.components
            ? res.components
                  .map((c) => normalizePluginV1Component(c, submitProxy))
                  .filter((c): c is PluginStateComponent => c !== null)
            : [],
    };
}

export function decodeMetadata(json: string): Partial<PluginV1Metadata> {
    return JSON.parse(json);
}

export default {
    normalizePluginState,
    decodeMetadata,
};
