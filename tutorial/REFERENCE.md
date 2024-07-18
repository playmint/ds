# Reference

## Setting up a wallt for Redstone and Claiming a zone

Downstream is deployed to Redstone, a mainnet L2! The following steps will teach you how to set up Metamask, purchase ETH, bridge it to Redstone and claim your Downstream Zone! 

1. You will need to install and set up Metamask. [You can follow his guide to get set up!](https://support.metamask.io/getting-started/getting-started-with-metamask/)

2. Once you have that set up, you will need to add the Redstone network to your Metamask. 

&nbsp; &nbsp; &nbsp; &nbsp; [You can find Redstone's network information here](https://redstone.xyz/docs/network-info)

&nbsp; &nbsp; &nbsp; &nbsp; [You can find a guide to adding a new network here](https://support.metamask.io/networks-and-sidechains/managing-networks/how-to-add-a-custom-network-rpc/)

3. You will need to bridge some ETH from Etherium mainnet to Redstone. A zone costs 0.001 ETH but you will likely need to purcahse more to cover the gas costs of bridging the ETH. [You can find out how to buy ETH here!](https://portfolio.metamask.io/)

4. Once you have your ETH, you can bridge it to Redstone [here.](https://redstone.xyz/deposit)

5. Finally, navigate to [Downstream](https://redstone.downstream.game/), connect your wallet, sign the requested transaction and select the "CLAIM ZONE" button.

If you have followed the steps correctly, you should now be the proud owner of a Downstream Redstone Zone!

## Creation Tools

### Building Fabricator
<img src="images/building-fabricator.png" width="200">

Browse to [https://redstone.downstream.game/building-fabricator](https://redstone.downstream.game/building-fabricator) 

The Building Fabricator allows you to deploy buildings and items to Downstream without having to leave the game! Once configured hit the ___Deploy___ button.

To add new behaviour to the building, once configured, hit the ___Export___ button and follow the instructions below for deploying any code changes from the command line.

### Tile Fabricator
<img src="images/tile-fabricator.png" width="200">

Browse to [https://redstone.downstream.game/tile-fabricator](https://redstone.downstream.game/tile-fabricator)

The Tile Fabricator allows you to place tiles and buildings and then export that as a configuration yaml file.

Any buildings you want to place on the map must be already deployed to the current running instance or you can use the import button for use by the tile-fabricator.

### CLI
<img src="images/cli.png" width="200">

Available as an npm package, `ds` is a command line interface for deploying buildings and maps as well as getting information about what's already been deployed to a Downstream instance.


#### Installation:

```npm install -g @playmint/ds-cli```

#### Commands   
_Some common tasks:_

| example | task |
|---|---|
| `ds apply -n redstone -z 1 -f BasicFactory.yaml -k <private key>` | Apply manifest files (deploy buildings and maps) |
| `ds destroy -n redstone -z 1 -f BasicFactory.yaml -k <private key>` | Reverses an apply of manifest files, esentially the oppose of 'apply' |
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
| `-n <network>` | Routes commands to a specific network (redstone, garnet or local). |
| `-z <zone>` | Routes commands to a specific zone. |
| `-f BasicFactory.yaml`| Apply just BasicFactory.yaml file. |
| `-R -f MyMapFolder`| Deploy all manifests in MyMapFolder recursively. |
| `-k <private key>` | Sign with this private key (see warning below). |

#### Command line signing

>[!CAUTION]
>Do not use a private key for any account you care about. You can use the Downstream connection dialogue box to copy the private key if connected with a burner. Or you can leave this option out and ds will give you a wallet connect QR code to sign.

#### Deploy a single building

- Use the __building-fabricator__ to _export_ building sources.
- Use __ds__ to deploy it to Downstream:

```ds apply -n redstone -z 1 -k <private key> -f ./BasicFactory.yaml```

#### Zones

- Downstream is made up of multiple zones
- Through the homepage users can mint new zones or access existing ones
- Use the `-z` flag in the `ds cli` to specify a zone to deploy to
- All Kinds are deployed against all zones
- Specific buildings, tiles, quests, etc are deployed against a zone

#### Deploy a map folder over the current map

- Use the building-fabricator to export building sources and the tile-fabricator to export map files.
- Combine them all in a single folder.
- Use `ds apply` to deploy them to Downstream:

```ds apply -n redstone -z 1 -k <private key> -R f <exported folder>```


#### Destroy a map folder over the current map

- After running the `ds apply` command, you can run the `ds destroy` command from the same location in order to reverse your deployment
- All tiles, buildings and bags will be destroyed but the kinds specified during the apply will remain.

**Please note:** If you have modified the files you have applied to a zone, you will no longer be able to pass them through `ds destroy`. It is prudent to keep a copy of the files you have applied in the state you applied them in.
  
```ds destroy -n redstone -z 1 -k <private key> -R f <exported folder>```


## Adding Game Logic

The files exported from the Building Fabricator act as a starting point for implementing your own logic.

| File | Purpose | Notes |
|---|---|---|
| BasicFactory.yaml | The manifest | Contains the parameters set by you in the Building Fabricator and is the entry point when passed to `ds apply`. |
| BasicFactory.js | UI and Action dispatching | Implements an `update` function that is called when an instance of the building is clicked on in game. Use the `state` parameter to make control what html and buttons are returned.Dispatch onchain actions on behalf of the selected ***Unit*** with `ds.dispatch` |
| BasicFactory.sol | Onchain logic | A solidity contract implementing `BuildingKind` interface. The entry point is the `BuildingKind.use` function, which can dispatch actions on behalf the ***Building***. |

## Example Buildings

__[All buildings referenced can be found here](../contracts/src/maps)__

| Folder        | Description          | Notes  |
|---------------|----------------------|--------|
| Basic Factory | Default Factory Code | This is the code exported by the Building Fabricator; It also contains commented out code for restricting access to items | 
| Cocktail Hut  | Grab a cocktail      | Demonstrates: Billboards; Item Plugin; js fetch API; Tile colouring |
| DuckBurger    | Popup Battle Kit     | All the buildings you need to start a game of Ducks vs Burger. Demonstrates: Solidity function selection with `buildingkind.use()`'s `payload` parameter; Reward claim; Timed session; Team allocation; Unit model swaps; Countdown display; Counter display; |
| StateStorage  | Feature demo         | Demonstrates: Storing state onchain in a way that can be read by the js plugin code. |


# Connecting External Apps

## External Clients
See [external-connection](external-connections.md) for connecting external clients to Downstream state.

## Downstream Item NFTs
All Downstream items moved to the player's Wallet inventory are [ERC1155 item tokens](../contracts/src/Items1155.sol) owned by the connected player:

<img src="images/wallet.png" width="200"> 

Dapps on the same chain could interact with these items in standard ways.

## Onchain composability
Any Downstream building can interact with any other contract, including other onchain games, deployed to the same chain.

Any other contract on the same chain can interact with the Downstream's read-only contract api but would not be able to send write actions.
