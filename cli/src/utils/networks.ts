export type Network = {
    name: string;
    description: string;
    default?: boolean;
    wsEndpoint: string;
    httpEndpoint: string;
};

const ephemeralNetworks = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map((i) => ({
    name: `hexwood${i}`,
    description: 'ephemeral private test network',
    wsEndpoint: `wss://services-hexwood${i}.downstream.game/query`,
    httpEndpoint: `https://services-hexwood${i}.downstream.game/query`,
}))

const localNetworks = [
    {
        name: 'local',
        description: 'ephermal local instance of the game',
        wsEndpoint: 'ws://localhost:8080/query',
        httpEndpoint: 'http://localhost:8080/query',
    },
];

export const networks: Network[] = [
    ...ephemeralNetworks,
    ...localNetworks,
];
