# External Connections

External clients can connect to deployed Downstream instances and read game state in one of two ways.

    The urls here assume running locally. Reach out to Playmint if you want to connect to a public instance.

## 1. GraphQL

An instance of the Downstream platform includes an indexer with a GraphQL api.
This is used by our web and command line clients for all action dispatches and state queries. 

You could make use of this from your own clients:

endpoint: [localhost:8080/query](https://localhost:8080/query)

playground: [localhost:8080]( https://localhost:8080)

examples can be found in our core client module, e.g:

https://github.com/playmint/ds/blob/main/core/src/world.graphql

## 2. Network RPC

The JSON-RPC endpoint for the network can be used to query the chain directly outside of Downstream for more advanced use cases.

When running locally there is an anvil chain available at  [localhost:8545]( https://localhost:8545)

On a Playmint Devnet this is a private test network so if you wanted to deploy something outside of the context of Downstream you would need a wallet with our private fake ETH in it and so must use one of the test accounts so please get in touch.