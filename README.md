# Downstream

Contracts, client libraries, and plugins for the on-chain Downstream game.

## How to play and build on top of Downstream

See the [docs](./docs/README.md)

## How to build this project

### Building with Docker

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

### Building from source (for development)

If you are working on the client, then you will need to build everything
yourself.

You will need the following tools installed:

* Javascript toolchain (node lts/gallium)
* Go toolchain (go v1.19)
* Solidity toolchain (foundry)
* Ethereum binaries (abigen)
* Unity Editor (2021.3.13f1)

clone this repository:

```
git clone --recurse-submodules https://github.com/playmint/ds-unity.git
```

build and start the client and supporting services in development mode run:

```
make dev
```

Client will be available at localhost:3000


### Building from source (for production)

Github Actions will build production ready Docker images on merge to `main`
available: ghcr.io/playmint/ds

To build the image yourself run:

```
docker build -t ghcr.io/playmint/ds:latest .
```




