# Redstone Cheatsheet
  
## How to get your own Zone!

Head over to [redstone.downstream.game](https://redstone.downstream.game), connect your wallet and select the "Mint" button on the home page!

You will now be the proud owner of a zone in Downstream!

## Setting up your zone

### `ds-cli`

In order to deploy a map to your zone, you will need to download `ds-cli`, you can do that by installing [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) or [npm Windows](https://nodejs.org/en/download/) and then installing `ds-cli` via npm using `npm install -g @playmint/ds-cli`

#### CLI commands

| example | task |
|---|---|
| `ds apply -n redstone -z <your-zone-number> -f BasicFactory.yaml` | Apply manifest files (deploy buildings and maps) |
| `ds destroy -n local -z <your-zone-number>  -f BasicFactory.yaml` | Reverses an apply of manifest files, esentially the oppose of 'apply' |
| `ds apply help` | help on apply command |
| `ds destroy help` | help on destroy command |
| `ds get -n redstone items` | Get ids for all items |
| `ds get -n redstone buildingkinds` | Get info for all buildingkinds |
| `ds get -n redstone buildingkinds` | Get info for all buildingkinds |
| `ds get help` | help on get command |
| `ds help` | help on all commands |

_options explained_
| option | description |
|---|---|
| `-n <network>` | Specify a network, options: redstone, garnet, local |
| `-z <zone>` | Routes commands to a specific zone. | 
| `-f <name>.yaml`| Apply a specific yaml. |
| `-R -f MyMapFolder`| Deploy all manifests in MyMapFolder recursively. |
| `-k <private key>` | Sign with this private key (see warning below). |

PLEASE NOTE: It is recommended not to pass a private key into the cli, if you do not use the -k flag, your default browser will open a new tab with a MetaMask auth flow.


### Drawing a map

<img src="images/tile-fabricator.png" width="200">

If you navigate to [redstone.downstream.game/tile-fabricator](https://redstone.downstream.game/tile-fabricator), you will be able to draw a tile map using our Tile Fabricator! Once you are happy, you can hit the export button to get a yaml file which can be passed into the `ds-cli` and deployed against your Zone!

### Building Fabricator
<img src="images/building-fabricator.png" width="200">

Browse to [redstone.downstream.game/building-fabricator](https://redstone.downstream.game/building-fabricator)

The Building Fabricator allows you to deploy buildings and items to Downstream without having to leave the game! Once configured hit the ___Deploy___ button.

To add new behaviour to the building, once configured, hit the ___Export___ button and follow the instructions below for deploying any code changes from the command line.

You can also use the __building-fabricator__ to _export_ building sources and apply it using the cli to Downstream:
```ds apply -n redstone -z <zone-number> -f ./BasicFactory.yaml```



#### Creating

- Use the building-fabricator to export building sources and the tile-fabricator to export map files.
- Combine them all in a single folder.
- Use `ds apply` to deploy them to the local running Downstream:

```ds apply -n redstone -z <zone-number> -R f <exported folder>```


#### Destroy a map folder over the current map

- After running the `ds apply` command, you can run the `ds destroy` command from the same location in order to reverse your deployment
- All tiles, buildings and bags will be destroyed but the kinds specified during the apply will remain.

**Please note:** If you have modified the files you have applied to a zone, you will no longer be able to pass them through `ds destroy`. It is prudent to keep a copy of the files you have applied in the state you applied them in.
  
`ds destroy -n redstone -z <zone-number> -R f <exported folder>`


## External Connections
External clients can connect to deployed Downstream instances and read game state in one of two ways.


### 1. Addresses

In order to get the game and NTF addresses, please navigate to [https://redstone.downstream.game/config.json](https://redstone.downstream.game/config.json)

### 2. GraphQL
An instance of the Downstream platform includes an indexer with a GraphQL api.
This is used by our web and command line clients for all action dispatches and state queries. 

You could make use of this from your own clients:

Downstream Redstone Eendpoint: [services-redstone.downstream.game/query](https://services-redstone.downstream.game/query)

GraphQL Playground: [services-redstone.downstream.game](https://services-redstone.downstream.game/)

examples can be found in our core client module, e.g:

https://github.com/playmint/ds/blob/main/core/src/world.graphql


### 3. Downstream Item NFTs
All Downstream items moved to the player's Wallet inventory are [ERC1155 item tokens](../contracts/src/Items1155.sol) owned by the connected player:

<img src="images/wallet.png" width="200"> 

Dapps on the same chain could interact with these items in standard ways.


### 4. Onchain composability
Any Downstream building can interact with any other contract, including other onchain games, deployed to the same chain.

Any other contract on the same chain can interact with the Downstream's read-only contract api but would not be able to send write actions.


## Further Tutorials
Please go to our [Tutorials](README.md) and follow on to have a more curated learning experience!