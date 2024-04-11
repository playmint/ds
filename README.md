
<img src="tutorial/images/header.png">

___Downstream is a fully onchain game platform and creation tool.___


# Build your own game with Downstream

Follow the guide to [build your own game with Downstream](./tutorial/README.md).

# Build and run a local platform instance

<h3>Get building on top of Downstream</h3>
<details>
<summary>Clone Repository (with submodules and LFS)</summary>

## Clone Repository

The repository needs cloning with LFS and recursive submodules.

- **Install Git:** [Git SCM](https://git-scm.com/download/) for download and installation.
- **Install Git-LFS:** Visit [Git-LFS](https://git-lfs.com/)
- **Initialise Git-LFS:** Run the following command:
  ```
  git lfs install
  ```
- **Clone the Repository:** Use the following command:
  ```
  git clone --recurse-submodules https://github.com/playmint/ds
  ```

## **_⚠️ 🖥 Windows_** 

Windows users must ensure they have symlinks enabled.

- **Go to ds**
  ```
  cd ds
  ```
- **Set symlinks to true**
  ```
  git config core.symlinks true
  ```
</details>

<details>
<summary>Running with Docker</summary>

## Running with Docker

If you only need a local copy of the game built (without development helpers
like hot reloading etc), then the easiest way is to provision using
Docker Compose.

[Install Docker Desktop](https://docs.docker.com/get-docker/)

```
docker compose up --pull=always
```

This will fetch the most recently built images for the game and run them
without requiring a full build.

Once ready, the client will be available at http://localhost:3000

See "Running Local with different Map Setups" section for deploying different maps,

<details>
<summary>Docker Trouble shooting</summary>

## Docker Trouble shooting

**1. Hardware Virtualisation**
If when trying to run Docker you hit this error:
```
hardware assisted virtualization and data execution protection must be enabled in the bios
```
You will need to enter your BIOS and activate Hardware Virtualisation. This is usually the case for AMD processors.
</details>
</details>

<h3>Advanced options for contributors</h3>
<details>
<summary>Building from Source</summary>

## Building from Source

For deploying locally with maximum flexibility and minimum rebuild times, you can install the whole tool chain and then create a local build with make.

### Install tools

Follow the [instructions for installing tools](./install-tools.md).

### Build & Run
In the ds directory, run
```
make dev
```
In your browser, open `http://localhost:3000/`

### Rebuilding after core changes: 
If you have built the map during the `make dev` flow and since, there have been changes in the Unity scene
you will need to rebuild the map. To do this, it is adviced to clean all build artifacts with

```
make clean
``` 

Once you are done, you can either build everything again with `make dev` or you can just
build the map by using the `make map` command.
</details>

<details>
<summary>Running locally with different maps</summary>

# Running locally with different maps

By Default, running `make dev` will spawn a one hex sized map and running with `docker` will spawn (the only  slightly larger) "tiny" map. 

## 1. Using pre-built Maps

The `ds/contracts/src/maps/` folder contains a few pre-made maps.

In order to force one of these maps to be deployed with a local build of the game you need to set the MAP env variable.

For `docker` builds this must be done by editing the `.env` file in the root
of the repository. 

```
MAP=quest-map
```

For `make` builds (and OSX docker builds) the MAP variable can be set as part of the make command; e.g. 

```
MAP=quest-map make dev
```

## 2. Claiming a zone

Once your build has succeeded, `http://localhost:3000/tile-fabricator` will take you to the Downstream homepage. Here you can sign in via Metamask, Wallet connect or use one of our Burner wallets. When deploying locally, a wallet called the 


## 2. Apply a map after deploying

After doing a standard `docker` or `make` build, you can run the DS apply command and point it at one of the map folders. For example: `ds apply -n local -z 1 -R -f ./contracts/src/maps/quest-map/`

## 3. Build your own map and deploy it

Once the game is running locally, browsing to `http://localhost:3000/tile-fabricator` will show the Tile Fabricator.

Once in the Tile Fabricator, you can design and export a map file. If you want to pre-populate your map wih buildings you will need to import .yaml files that define the buildingKinds.

If you then rename the .yml file to a .yaml and move it to your desired location, you will be able to run the ds apply command, like so:
`ds apply -n local -z 1 -f ./path/to/mymap.yaml`

## 4 Generating the performance-test map

This is only possible with the `make` deploy flow and cannot be triggered for a `docker` build. To generate the performance-test map (used to push the limits of number of tiles and plugins) run:

```
NUM_ARENAS=4 make contracts/src/maps/performance-test
```

...this generates a map configuration in `contracts/src/maps/performance-test`

You can then either start locally via `MAP=performance-test make dev` or manually `ds apply -n local -z 1 -R -f contracts/src/maps/performance-test`
</details>

# References
__[For more information, check the reference page](/tutorial/REFERENCE.md)__
