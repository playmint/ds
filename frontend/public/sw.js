importScripts('https://cdn.jsdelivr.net/gh/golang/go@go1.20.4/misc/wasm/wasm_exec.js');
importScripts('https://cdn.jsdelivr.net/gh/nlepage/go-wasm-http-server@v1.1.0/sw.js');

registerWasmHTTPListener('/sw.wasm', { base: 'sw' });

// Skip installed stage and jump to activating stage
addEventListener('install', (event) => {
    console.log('[sw] installing');
    self.skipWaiting();
});

// Start controlling clients as soon as the SW is activated
addEventListener('activate', (event) => {
    console.log('[sw] activating');
    event.waitUntil(clients.claim());
});
