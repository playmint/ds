# Downstream

Contracts, client libraries, and plugins for the on-chain Downstream game.

## How to play and build on top of Downstream

See the [docs](./docs/index.md)

## How to build this project

<details>
<summary>Clone Repository (with submodules and LFS)</summary>

### Clone Repository

The repository needs cloning with LFS and recursive submodules.

- **Install Git:** [Git SCM](https://git-scm.com/download/mac) for download and installation.
- **Install Git-LFS:** Visit [Git-LFS](https://git-lfs.com/)
- **Initialise Git-LFS:** Run the following command:
  ```
  git lfs install
  ```
- **Clone the Repository:** Use the following command:
  ```
  git clone --recurse-submodules https://github.com/playmint/ds
  ```
</details>

<details>
<summary>Running with Docker</summary>

### Running with Docker

If you only need a local copy of the game built (without development helpers
like hot reloading etc), then the easiest way is to provision using
Docker Compose.

[Install Docker Desktop](https://docs.docker.com/get-docker/)

```
docker compose up
```

This will fetch the most recently built images for the game and run them
without requiring a full build.

Once ready, the client will be available at http://locahost:3000

See "Running Local with different Map Setups" section for deploying different maps,

<details>
<summary>Docker Trouble shooting</summary>

### Docker Trouble shooting

**1. Hardware Virtulisation**
If when trying to run Docker you hit this error:
```
hardware assisted virtualization and data execution protection must be enabled in the bios
```
You will need to enter your BIOS and activate Hardware Virtualisation. This is usually the case for AMD processors.
</details>
</details>

<details>
<summary>Building from Source (For Development)</summary>

### Building from Source (For Development)

For deploying locally with maximum flexibility and minimum rebuild times, you can install the whole tool chain and then create a local build with make.

#### Install
Tools required to build Downstream:
- Unity Editor 2021.3.13f1
    - Unity WebGL submodule

(**_🖥 Windows_** The following should all be installed to WSL:)
- make
- gcc
- node (use nvm to match correct version)
- go (version go1.19.13 - similar versions may be fine)
- forge (version 0.2.0)
- ethereum tools (including solc and abigen)

<details>
<summary>Installation Instructions</summary>

#### Installation Instructions

##### OS specific instructions
- **🖥 Windows** users will need to instal Windows Subsystem for Linux (**__WSL__**) and carefully follow the instructions as to which tools need to be installed to native Windows vs inside WSL.
- **🍏 MacOS** supports all the tools natively.



##### 1. Unity
- Install [Unity Hub](https://unity.com/download)
- Install Unity Editor version 2021.3.13f1 via [Unity LTS archive](https://unity.com/releases/editor/qa/lts-releases?version=2021.3)
	- **🖥 Windows only** Use `"C:\Program Files\Unity\Hub\Editor\2021.3.13f1"` as your install path **(be sure to change the default path and folder name)**
- Install WebGL submodule

##### 2. WSL (Windows Subsystem for Linux)
**_🖥 Windows only_**
- **Install WSL:** Follow the guide at [Microsoft WSL Install](https://learn.microsoft.com/en-us/windows/wsl/install). Note that enabling virtualization might vary based on your CPU model.
- **Initial Setup in PowerShell:**
  - Run `wsl --install`.
  - Restart your PC.
  - Upon reboot, follow the on-screen instructions to complete Ubuntu setup.
  - Create a username and password as per [Microsoft's best practices](https://learn.microsoft.com/en-us/windows/wsl/setup/environment).
- **Switch to WSL1:** The default WSL2 can be changed to WSL1, which works better for our purposes.
  - In PowerShell, run `wsl --list --verbose` to find your Ubuntu distribution name.
  - Switch to WSL1 with `wsl --set-version [distribution name] 1`. Example: `wsl --set-version Ubuntu 1`.

- **Installing WSL essentials**
- **Access WSL:** Use `wsl` command in PowerShell or open the Ubuntu application.
- **Install gcc & make:** 
  ```
  sudo apt update
  sudo apt install build-essential
  ```

> ⚠️ All remaining tools should be installed to WSL if running on Windows

##### 3. Node
  - Recommended to use nvm ([nvm install script](https://github.com/nvm-sh/nvm#install--update-script)).
  - Run the following commands:
    ```
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
    ```
    Navigate to the `ds` directory and run `nvm install`.

**_🖥 Windows:_** 
 - Note ds path with be under /mnt/; e.g. `$cd /mnt/d/playmint/ds` 
 - Extra Node configuration under WSL may be necessary:
   - Set environment variable:
     ```
     NODE_OPTIONS=--max-old-space-size=4096
     ```
   - Restart your machine.
   - Update Node packages:
     ```
     npm update -g
     ```
   - Update Node packages:
    ```
    npm cache clean -f
    ```

##### 4. Go
  - Download **go1.19.13.linux-amd64.tar.gz** from [Go Downloads](https://go.dev/dl/).
  - Follow installation instructions at [Go Install Guide](https://go.dev/doc/install); 
  - **_⚠️ 🖥 Windows_** use the Linux download and install instructions to setup in WSL.

##### 5. Ethereum Tools
**_🖥 Windows_**
  ```
  sudo add-apt-repository ppa:ethereum/ethereum
  sudo apt-get update
  sudo apt-get install solc
  sudo apt-get install abigen
  ```
**_🍏 MacOS_**
  ```
  brew tap ethereum/ethereum
  brew install ethereum
  ```

##### 6. Foundry (forge and anvil)
Follow instructions at [Foundry Installation](https://book.getfoundry.sh/getting-started/installation):
  ```
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```
</details>

#### Build & Run
In the ds directory, run
```
make dev
```
In your browser, open `http://localhost:3000/`

#### Rebuilding after core changes: 
If you have built the map during the `make dev` flow and since, there have been changes in the Unity scene
you will need to rebuild the map. To do this, it is adviced to clean all build artifacts with

```
make clean
``` 

Once you are done, you can either build everything again with `make dev` or you can just
build the map by using the `make map` command.
</details>

<details>
<summary>Building from source (for production)</summary>

### Building from source (for production)

Github Actions will build production ready Docker images on merge to `main`
available: ghcr.io/playmint/ds

To build the image yourself run:

```
docker build -t ghcr.io/playmint/ds:latest .
```
</details>

<details>
<summary>Running Local with different Map Setups</summary>

## Running Local with different Map Setups

By Default, running `make dev` will spawn a one hex sized map and running with `docker` will spawn (the only  slightly larger) "tiny" map. 

### 1. Using Playmint's Maps

Inside of the `ds/contracts/src/maps/` folder, you will find a few premade maps by Playmint. 
In order to force one of these maps to be deployed with a local build of the game you need set the MAP env variable.

For `docker` builds this must be doen by editing the `.env` file in the root
of the repository. 

```
MAP=quest-map
```

For `make` builds the MAP variable can be set as part of the make command; e.g. 

```
MAP=quest-map make dev
```

### 2. Apply a map after deploying

After doing a standard `docker` or `make` build, you can run the DS apply command and point it at one of the map folders. For example: `ds apply -R -f ./contracts/src/maps/quest-map/`

### 3. Build your own map and deploy it

Once the game is running locally, browsing to `http://localhost:3000/tile-fabricator` will show the Tile Fabricator.

Once in the Tile Fabricator, you can design and export a map file. If you want to pre-populate your map wih buildings you will need to import .yaml files that define the buildingKinds.

If you then rename the .yml file to a .yaml and move it to your desired location, you will be able to run the ds apply command, like so:
`ds apply -R -f ./path/to/mymap.yaml`

### 4 Generating the performance-test map

This is only possible with the `make` deploy flow and cannot be triggered for a `docker` build. To generate the performance-test map (used to push the limits of number of tiles and plugins) run:

```
NUM_ARENAS=4 make contracts/src/maps/performance-test
```

...this generates a map configuration in `contracts/src/maps/performance-test`

You can then either start locally via `MAP=performance-test make dev` or manually `ds apply -R -f contracts/src/maps/performance-test`
</details>
