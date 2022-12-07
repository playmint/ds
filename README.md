# ds-unity

## Overview

The Unity Engine Game Client for the Dawnseekers game.

## Provisioning backend services

### Dependecies

You a local EVM node with ds-contracts and the backend api services.

We use docker to provision these all together and there are two paths:

* Easy mode (most recent build)
* Hard mode (build locally from sources)

#### Provisioning backend services (Easy mode)

To provision a local instance of the chain, and backend services based on the
most recent builds using docker:

```
docker-compose --profile=nightly up --pull=always
```

#### Provisioning backend services (Hard mode)

To provision all the services built from your local sources, you must have the
following repositories cloned as siblings next to each other:

* [ds-unity](https://github.com/playmint/ds-unity)
* [ds-contracts](https://github.com/playmint/ds-contracts)
* [cog-services](https://github.com/playmint/cog-services)

You can then use the `dev` profile to provision with docker:

```
docker-compose --profile=dev up --abort-on-container-exit --build
```

Recommend using `--abort-on-container-exit` and `--build` to ensure things
start (and fail) in an expected way.

