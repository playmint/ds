import { beforeEach, expect, it } from 'vitest';

import { Client } from '../src/lib';

interface ClientTestContext {
    client: Client;
}

beforeEach<ClientTestContext>(async (ctx) => {
    const mockHTTPClient = {};
    ctx.client = new Client({
        httpClient: mockHTTPClient,
        wsClient: mockWSClient,
    });
});

it<ClientTestContext>('should subscribe to state', async (ctx) => {
    return new Promise((resolve, reject) => {
        let sub = null;
        const done = (value, err) => {
            if (sub) {
                sub.unsubscribe();
            }
            if (err) {
                reject(err);
                return;
            }
            resolve(value);
        };
        sub = ctx.client.subscribe({
            next: (state) => done(state, null),
            error: (err) => done(null, err),
        });
    });
});
