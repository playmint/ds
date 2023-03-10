# Dawnseekers

## Overview

Contracts, client libraries, and plugins for the on-chain Dawnseekers game.

## Building

### Building with Docker

If you only need a local copy of the game built (without development helpers
like hot reloading etc), then the easist way is to provision using
Docker Compose.

To build and start the client and supporting services run:

```
docker compose up --build
```

Client will be available at locahost:3000

### Building from source (for development)

If you are working on the client, then you will need to build everything yourself.

You will need the following tools installed:

* Javascript toolchain (node lts/gallium)
* Go toolchain (go v1.19)
* Solidity toolchain (foundry)
* Ethereum binaries (abigen)
* Unity Editor (2021.3.13f1)

clone this repository:

```
git clone https://github.com/playmint/ds-unity.git
```

build and start the client and supporting services in development mode run:

```
make dev
```

Client will be available at localhost:3000


### Building from source (for production)

Github Actions will build production ready Docker images on merge to `main` available: ghcr.io/playmint/ds






