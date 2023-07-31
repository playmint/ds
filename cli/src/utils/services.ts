import fetch from 'cross-fetch';
import WebSocket from 'ws';

import { makeCogClient } from '@downstream/core';
import { networks } from '../utils/networks';

import { pipe, take, toPromise } from 'wonka';

export const client = async (argv) => {
    const network = networks.find((n) => n.name == argv.network);
    if (!network) {
        throw new Error(`no network found with name ${argv.network}`);
    }
    const { client } = makeCogClient({
        wsEndpoint: network.wsEndpoint,
        wsSocketImpl: WebSocket,
        httpEndpoint: network.httpEndpoint,
        httpFetchImpl: fetch,
    });

    argv.game = 'DOWNSTREAM';
    argv.client = () => pipe(client, take(1), toPromise);
    argv.clients = client;
};
