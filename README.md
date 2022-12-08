# ds-unity

## Overview

The Unity Engine Game Client for the Dawnseekers game.

## Provisioning backend services

### Dependecies

You need a local EVM node with ds-contracts and the api services.

We use [Docker](https://docs.docker.com/get-docker/) to provision these all together and there are two paths:

* Easy mode (fetches latest build)
* Hard mode (builds images locally)

### Provisioning backend services (Easy mode)

To provision a local instance of the chain, and backend services based on the
most recent builds using docker:

```
docker-compose up
```

### Provisioning backend services (Hard mode)

To provision with services built from your local sources, you will
need to have the following repositories cloned as siblings next to
each other:

* [ds-unity](https://github.com/playmint/ds-unity)
* [ds-contracts](https://github.com/playmint/ds-contracts)
* [cog-services](https://github.com/playmint/cog-services)

You can then tell compose to rebuild from source by including the
relevent configurations and to override the defaults and addding the
`--build` flag.

For example to provision with changes from your local ds-contracts
include the `ds-contracts/docker-compose.yml` as an override:

```
docker compose \
	-f ../ds-contracts/docker-compose.yml \
	up --build
```

to also use a local build of cog-services add that override too:

```
docker compose \
	-f ../cog-services/docker-compose.yml \
	-f ../ds-contracts/docker-compose.yml \
	up --build
```

Tips:

Use `--abort-on-container-exit` to make it crash and burn on error
rather than get stuck in a restart loop.

Use `docker compose down -v` to destroy the built images if you want a
clean slate for the next `up`

