# ds-cli

## overview

`ds` is a command line client for interacting with the game [Downstream](https://downstream.game)

## install

Install via `npm`:

```
npm install -g @playmint/ds-cli
```

## Example usage

Show the available networks (deployed versions of the game) you can connect to:

```
ds networks list
```

Search for an item by name on the `testnet` deployment:

```
ds -n testnet items search goo
```

List all the available game actions you can dispatch:

```
ds --network testnet actions list
```

Execute a game action (you will be prompted to authorize a session by scanning a QR code with a phone wallet):

```
ds --network testnet action dispatch DEV_SPAWN_TILE '[1, 100, -100, 0]'
```
