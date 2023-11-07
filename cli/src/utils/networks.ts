export type Network = {
    name: string;
    description: string;
    default?: boolean;
    wsEndpoint: string;
    httpEndpoint: string;
};

export const networks: Network[] = [
    {
        name: 'hexwood0',
        description: 'ephemeral private invite only test network',
        wsEndpoint: 'wss://services0.downstream.game/query',
        httpEndpoint: 'https://services0.downstream.game/query',
    },
    {
        name: 'hexwood1',
        description: 'ephemeral private invite only test network',
        wsEndpoint: 'wss://services1.downstream.game/query',
        httpEndpoint: 'https://services1.downstream.game/query',
    },
    {
        name: 'hexwood2',
        description: 'ephemeral private invite only test network',
        wsEndpoint: 'wss://services2.downstream.game/query',
        httpEndpoint: 'https://services2.downstream.game/query',
    },
    {
        name: 'hexwood3',
        description: 'ephemeral private invite only test network',
        wsEndpoint: 'wss://services3.downstream.game/query',
        httpEndpoint: 'https://services3.downstream.game/query',
    },
    {
        name: 'hexwood4',
        description: 'ephemeral private invite only test network',
        wsEndpoint: 'wss://services4.downstream.game/query',
        httpEndpoint: 'https://services4.downstream.game/query',
    },
    {
        name: 'hexwood5',
        description: 'ephemeral private invite only test network',
        wsEndpoint: 'wss://services5.downstream.game/query',
        httpEndpoint: 'https://services5.downstream.game/query',
    },
    {
        name: 'hexwood6',
        description: 'ephemeral private invite only test network',
        wsEndpoint: 'wss://services6.downstream.game/query',
        httpEndpoint: 'https://services6.downstream.game/query',
    },
    {
        name: 'hexwood7',
        description: 'ephemeral private invite only test network',
        wsEndpoint: 'wss://services7.downstream.game/query',
        httpEndpoint: 'https://services7.downstream.game/query',
    },
    {
        name: 'hexwood8',
        description: 'ephemeral private invite only test network',
        wsEndpoint: 'wss://services8.downstream.game/query',
        httpEndpoint: 'https://services8.downstream.game/query',
    },
    {
        name: 'hexwood9',
        description: 'ephemeral private invite only test network',
        wsEndpoint: 'wss://services9.downstream.game/query',
        httpEndpoint: 'https://services9.downstream.game/query',
    },
    {
        name: 'local',
        description: 'ephermal local instance of the game',
        wsEndpoint: 'ws://localhost:8080/query',
        httpEndpoint: 'http://localhost:8080/query',
    },
];
