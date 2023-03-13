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
