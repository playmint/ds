export type Network = {
    name: string;
    description: string;
    default?: boolean;
    wsEndpoint: string;
    httpEndpoint: string;
    loginEndpoint: string;
};

const ephemeralNetworks = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map((i) => ({
    name: `hexwood${i}`,
    description: 'ephemeral private testnet',
    wsEndpoint: `wss://services-hexwood${i}.downstream.game/query`,
    httpEndpoint: `https://services-hexwood${i}.downstream.game/query`,
    loginEndpoint: `https://hexwood${i}.downstream.game/login`
}))

const localNetworks = [
    {
        name: 'local',
        description: 'local private devnet',
        wsEndpoint: 'ws://localhost:8080/query',
        httpEndpoint: 'http://localhost:8080/query',
        loginEndpoint: `http://localhost:3000/login`
    },
];

const publicNetworks = [
    {
        name: 'garnet',
        description: 'public testnet',
        wsEndpoint: `wss://services-garnet.downstream.game/query`,
        httpEndpoint: `https://services-garnet.downstream.game/query`,
        loginEndpoint: `https://garnet.downstream.game/login`
    },
    {
        name: 'redstone',
        description: 'public mainnet',
        wsEndpoint: `wss://services-redstone.downstream.game/query`,
        httpEndpoint: `https://services-redstone.downstream.game/query`,
        loginEndpoint: `https://redstone.downstream.game/login`
    },
];

export const networks: Network[] = [
    ...ephemeralNetworks,
    ...localNetworks,
    ...publicNetworks,
];
