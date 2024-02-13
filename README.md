# Downstream

Contracts, client libraries, and plugins for the on-chain Downstream game.

## How to play and build on top of Downstream

See the [docs](./docs/README.md)

## How to build this project

<details>

<summary>Building with Docker</summary>

If you only need a local copy of the game built (without development helpers
like hot reloading etc), then the easist way is to provision using
Docker Compose.

You need to build the unity map project first:

```
make map
```

Then to build and start the client and supporting services run:

```
docker compose up --build
```

Client will be available at locahost:3000

</details>

<details>

<summary>Building from Source (For Development) - macOS/Linux</summary>


If you are working on the client, then you will need to build everything
yourself.

You will need the following tools installed:

- Javascript toolchain (node lts/gallium)
- Go toolchain (go v1.19)
- Solidity toolchain (foundry)
- Ethereum binaries (abigen)
- Git (The in-house frontend is Fork)
- Git-LFS
- Unity Editor (2021.3.13f1)
  - Unity WebGL submodule

Make sure LFS is initialised and then clone this repository:

```
git lfs version
git clone --recurse-submodules https://github.com/playmint/ds.git
```


build and start the client and supporting services in development mode run:

```
make dev
```

Client will be available at localhost:3000

</details>

<details>

<summary>Building from Source (For Development) - Windows</summary>

This guide provides a detailed, step-by-step process for Windows users who are setting up a development environment for the client.

## What You Need

These are the tools you will be installing:
- **OS Tools:**
  - Git
  - Unity Editor 2021.3.13f1
  - Unity WebGL submodule
- **Terminal Tools (Using WSL):**
  - make
  - gcc
  - node
  - go (version go1.19.13 - similar versions may be fine)
  - forge (version 0.2.0)
  - solc (version 0.8.15 to 0.8.21)

Please refer to the instructions below for setup guidance.

## Installation Instructions

### 1. Install Unity (for Windows)
- Install [Unity Hub](https://unity.com/download)
- Install Unity Editor version 2021.3.13f1 via [Unity LTS archive](https://unity.com/releases/editor/qa/lts-releases?version=2021.3)
	- Use `"C:\Program Files\Unity\Hub\Editor\2021.3.13f1"` as your install path **(be sure to change the default path and folder name)**
	- Install WebGL submodule


### 2. Clone the Repository
- **Install Git:** Visit [Git SCM](https://git-scm.com/download/win) for download and installation.
- **Clone the Repository:** Use the following command, **(do not clone within WSL)**:
  ```
  git clone --recurse-submodules https://github.com/playmint/ds
  ```

### 3. Setting Up WSL (Windows Subsystem for Linux)
- **Install WSL:** Follow the guide at [Microsoft WSL Install](https://learn.microsoft.com/en-us/windows/wsl/install). Note that enabling virtualization might vary based on your CPU model.
- **Initial Setup in PowerShell:**
  - Run `wsl --install`.
  - Restart your PC.
  - Upon reboot, follow the on-screen instructions to complete Ubuntu setup.
  - Create a username and password as per [Microsoft's best practices](https://learn.microsoft.com/en-us/windows/wsl/setup/environment).
- **Switch to WSL1:** The default WSL2 can be changed to WSL1, which works better for our purposes.
  - In PowerShell, run `wsl --list --verbose` to find your Ubuntu distribution name.
  - Switch to WSL1 with `wsl --set-version [distribution name] 1`. Example: `wsl --set-version Ubuntu 1`.

### 4. Installing Tools via WSL
- **Access WSL:** Use `wsl` command in PowerShell or open the Ubuntu application.
- **Install gcc & make:** (From now on we should be in WSL)
  ```
  sudo apt update
  sudo apt install build-essential
  ```
- **Install Node:**
  - Recommended to use nvm ([nvm install script](https://github.com/nvm-sh/nvm#install--update-script)).
  - Run the following commands:
    ```
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
    ```
    Navigate to the `ds` directory and run `nvm install`.

    e.g. $ `cd /mnt/d/playmint/ds` (Where you cloned the ds repository) *- Take note of /mnt/ as the path will look different to the normal Windows path*

- **Install Go:**
  - Download **go1.19.13.linux-amd64.tar.gz** from [Go Downloads](https://go.dev/dl/).
  - Follow installation instructions at [Go Install Guide](https://go.dev/doc/install) under the Linux section.
- **Install solc:**
  ```
  sudo add-apt-repository ppa:ethereum/ethereum
  sudo apt-get update
  sudo apt-get install solc
  sudo apt-get install abigen
  ```
- **Install Foundry (forge and anvil):**
  - Follow instructions at [Foundry Installation](https://book.getfoundry.sh/getting-started/installation):
    ```
    curl -L https://foundry.paradigm.xyz | bash
    foundryup
    ```

### 5. Node Configuration
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

### 6. Build & Run
- In the ds directory, run
  ```
  make dev
  ```
- In your browser, open `http://localhost:3000/`

</details>

<details>

<summary>Building from source (for production)</summary>

Github Actions will build production ready Docker images on merge to `main`
available: ghcr.io/playmint/ds

To build the image yourself run:

```
docker build -t ghcr.io/playmint/ds:latest .
```

</details>

<details>

<summary>Running Local with different Map Setups</summary>
<br>
By Default, running `Make Dev` will spawn a one hex sized map. In order to deploy locally with a different map, there are a few options

### 1. Using Playmint's Maps

Inside of the `ds/contracts/src/maps/` folder, you will find a few premade maps  by Playmint. In order to force one of these maps to be deployed with a `make dev`, you will need to add the MAP=$ arg to your command. Here are the currently supported MAP args in context:

`MAP=tiny make dev
MAP=quest-map make dev
MAP=default make dev`

### 2. Apply a map after deploying

After doing a standard make dev, you can run the DS apply command and point it at one of the map folders. For example: `ds apply -R -f ./contracts/src/maps/quest-map/`

### 3. Build your own map and deploy it

First up, you will need to run a `make dev` and then visit `http://localhost:3000/tile-fabricator`

Once in the Tile Fabricator, you can design and export a map file. 

If you then rename the .yml file to a .yaml and move it to your desired location, you will be able to run the ds apply command, like so:
`ds apply -R -f ./path/to/mymap.yaml`

### 4 Generating the performance-test map

To generate the performance-test map (used to push the limits of number of tiles and plugins) run:

```
NUM_ARENAS=4 make contracts/src/maps/performance-test
```

...this generates a map configuration in `contracts/src/maps/performance-test`

You can then either start locally via `MAP=performance-test make dev` or manually `ds apply -R -f contracts/src/maps/performance-test`

</details>
