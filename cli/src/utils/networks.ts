export type Network = {
    name: string;
    description: string;
    default?: boolean;
    wsEndpoint: string;
    httpEndpoint: string;
};

export const networks: Network[] = [
    // [!] there is no "mainnet" deployment yet, so right now this version
    //     points to the ds-test deployment same as "testnet"
    //     it is here now as it will be the default in the future
    {
        name: 'mainnet',
        description: 'public mainnet network',
        wsEndpoint: 'wss://services-ds-test.dev.playmint.com/query',
        httpEndpoint: 'https://services-ds-test.dev.playmint.com/query',
        default: true,
    },
    {
        name: 'testnet',
        description: 'public test network',
        wsEndpoint: 'wss://services-ds-test.dev.playmint.com/query',
        httpEndpoint: 'https://services-ds-test.dev.playmint.com/query',
    },
    {
        name: 'devnet',
        description: 'ephemeral private invite only test network',
        wsEndpoint: 'wss://services-ds-main.dev.playmint.com/query',
        httpEndpoint: 'https://services-ds-main.dev.playmint.com/query',
    },
    {
        name: 'expnet',
        description: 'ephemeral private invite only experimental network',
        wsEndpoint: 'wss://services-ds-exp.dev.playmint.com/query',
        httpEndpoint: 'https://services-ds-exp.dev.playmint.com/query',
    },
    {
        name: 'local',
        description: 'ephermal local instance of the game',
        wsEndpoint: 'ws://localhost:8080/query',
        httpEndpoint: 'http://localhost:8080/query',
    },
];
