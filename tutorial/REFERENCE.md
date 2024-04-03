# Reference
  
## Local instance

Build and run a local Downstream instance with Docker. Follow the instructions for "_running with docker_" in the root [README](../README.md).

The game will be running at [localhost:3000/](http://localhost:3000/).

<img src="images/fresh-local-downstream.png" width="200">

During development, its recommended to always connect with the Burner option.

## Creation Tools

### Building Fabricator
<img src="images/building-fabricator.png" width="200">

Browse to [localhost:3000/building-fabricator](http://localhost:3000/building-fabricator)

The Building Fabricator allows you to deploy buildings and items to Downstream without having to leave the game! Once configured hit the ___Deploy___ button.

To add new behaviour to the building, once configured, hit the ___Export___ button and follow the instructions below for deploying any code changes from the command line.

### Tile Fabricator
<img src="images/tile-fabricator.png" width="200">

Browse to [localhost:3000/tile-fabricator](http://localhost:3000/tile-fabricator)

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
| `ds apply -n local -f BasicFactory.yaml -k <private key>` | Apply manifest files (deploy buildings and maps) |
| `ds apply help` | help on apply command |
| `ds get -n local items` | Get ids for all items |
| `ds get -n local buildingkinds` | Get info for all buildingkinds |
| `ds get -n local buildingkinds` | Get info for all buildingkinds |
| `ds get help` | help on get command |
| `ds help` | help on all commands |

_options explained_
| option | description |
|---|---|
| `-n local` | Routes commands to localhost. |
| `-f BasicFactory.yaml`| Apply just BasicFactory.yaml file. |
| `-R -f MyMapFolder`| Deploy all manifests in MyMapFolder recursively. |
| `-k <private key>` | Sign with this private key (see warning below). |

#### Command line signing

>[!CAUTION]
>Do not use a private key for any account you care about. You can use the Downstream connection dialogue box to copy the private key if connected with a burner. Or you can leave this option out and ds will give you a wallet connect QR code to sign.

#### Deploy a single building

- Use the __building-fabricator__ to _export_ building sources.
- Use __ds__ to deploy it to the local running Downstream:

```ds apply -n local -k <private key> -f ./BasicFactory.yaml```

#### Deploy a map folder over the current map

- Use the building-fabricator to export building sources and the tile-fabricator to export map files.
- Combine them all in a single folder.
- Use `ds apply` to deploy them to the local running Downstream:

```ds apply -n local -k <private key> -R f <exported folder>```


#### Deploy as the initial map

- Stop any local running build.
- Copy your map manifest and building source to [contracts/src/maps](../contracts/src/maps)<map-folder>
- Re-run with `MAP=<map-folder> docker compose up`
    - You can also set the MAP environment variable in the [.env file](../.env)

## Adding Game Logic

The files exported from the Building Fabricator act as a starting point for implementing your own logic.

| File | Purpose | Notes |
|---|---|---|
| BasicFactory.yaml | The manifest | Contains the parameters set by you in the Building Fabricator and is the entry point when passed to `ds apply`. |
| BasicFactory.js | UI and Action dispatching | Implements an `update` function that is called when an instance of the building is clicked on in game. Use the `state` parameter to make control what html and buttons are returned.Dispatch onchain actions on behalf of the selected ***Unit*** with `ds.dispatch` |
| BasicFactory.sol | Onchain logic | A solidity contract implementing `BuildingKind` interface. The entry point is the `BuildingKind.use` function, which can dispatch actions on behalf the ***Building***. |

> [!TIP]
> We are working on a tutorial to introduce all of Downstream's creation tools and game logic api. Until then, the examples below and reaching out in Discord are the best way to discover what's possible with your Downstream game.

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


# Video Guides

| Video             | Demonstrates         |
|-------------------|----------------------|
| <a href="https://drive.google.com/file/d/1rvXt3Fs4M0-yn83Mc0iAG9HlhIJpSDRl/view?usp=drive_link"><img src="images/dvb-thumb.png" width="200"></a>  | Build and run; Default Map; Deploy example buildings;|
| <a href="https://drive.google.com/file/d/1f6xYuzhBMBFMIYWe_Xb8Sr2vIhLukORY/view?usp=drive_link"><img src="images/dvb2-thumb.png" width="200"></a> | Tile Fabricator; Custom Map; |
