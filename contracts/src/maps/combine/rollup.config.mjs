import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
    input: {
        BugDepositor: 'BugDepositor.js',
        DustDepositor: 'DustDepositor.js',
    },
    output: {
        dir: './',
        format: 'esm',
        entryFileNames: '[name].bundle.js',
    },
    plugins: [nodeResolve({browser: true})],
    // treeshake: true,
    external: ['websocket', 'ws', 'eventemitter3']
};
