# ds-contracts

## Overview

Dawnseekers contracts.

## Schema

:warning: super rough first pass, and has no relationship to anything in code, just throwing ideas around at this point
```mermaid
flowchart LR
    Player1([Player id=1])
    Seeker1([Seeker id=1])
    subgraph storage
        Store1([Storage id=seeker1 slots=4])
        Store2([Storage id=player1 slots=10])
    end
    subgraph map
        subgraph tiles
            Tile1([Tile 0,1])
            Tile2([Tile 1,1])
            Tile3([Tile 1,2])
        end
        Zone1([Zone])
    end
    subgraph items
        Resource1([Item type=resource id=gold])
        Resource2([Item type=resource id=stone])
        Resource3([Item type=resource id=iron])
        Mod1([Item type=mod id=1])
        Mod2([Item type=mod id=2])
    end
    subgraph crafting
        Blueprint1([Blueprint id=1])
    end
    Building1([Outpost])
    subgraph poi
        POI1([POI harvest])
        POISession1([POISession harvest])
        POISession1State
    end
    subgraph clock
        Block1
    end
    subgraph markets
        AMMPool([AMM Pool])
    end
    
    Tile1 -->|HAS_LOCATION| Zone1
    Tile2 -->|HAS_LOCATION| Zone1
    Tile3 -->|HAS_LOCATION| Zone1
    
    Seeker1 -->|HAS_OWNER| Player1
    
    Seeker1 -->|HAS_LOCATION at=$block| Tile2
    Seeker1 -->|PREV_LOCATION| Tile1
    
    Store1 -->|HAS_LOCATION| Seeker1
    Store1 -->|HAS_OWNER| Seeker1
    Store1 -->|HAS_CONTENTS w=50 id=slot1| Resource1
    Store1 -->|HAS_CONTENTS w=35 id=slot2| Resource2
    
    Store2 -->|HAS_LOCATION| Building1
    Store2 -->|HAS_OWNER| Player1
    Store2 -->|HAS_CONTENTS w=5 id=slot1| Resource3
    Store2 -->|HAS_CONTENTS w=1 id=slot2| Mod1
    
    Seeker1 -->|HAS_CONTENTS id=modslot| Mod2
    
    Building1 -->|HAS_LOCATION| Tile3
    
    POI1 -->|HAS_LOCATION| Tile2
    POI1 -->|HAS_REWARD w=20% id=a| Resource3
    POI1 -->|HAS_REWARD w=3% id=b| Resource3
    POI1 -->|HAS_REWARD w=0 id=bonus| Blueprint1
    POISession1 -->|HAS_LOCATION| POI1
    POISession1 -->|HAS_PARTICIPANT| Seeker1
    POISession1 -->|HAS_HASH| POISession1State
    POISession1 -->|AT_TIME| Block1
    
    AMMPool -->|HAS_LOCATION| Building1
    AMMPool -->|HAS_CONTENTS w=100 id=a| Resource1
    AMMPool -->|HAS_CONTENTS w=500 id=b| Resource2

```

## Running the tests

You can run the tests through docker:

```
docker run -v $PWD:/app --platform=linux/amd64 ghcr.io/foundry-rs/foundry:latest "forge test --root /app"
```

append `--watch` to have the tests re-run on change...

```
docker run -v $PWD:/app --platform=linux/amd64 ghcr.io/foundry-rs/foundry:latest "forge test --root /app --watch"
```

or if you have [foundry](https://getfoundry.sh/) locally you should be able to use directly...

```
forge test
```

## Deploying a local dev chain

**If you are working on [ds-unity](https://github.com/playmint/ds-unity), you probably want to use the instructions: [here](https://github.com/playmint/ds-unity)**

If you just want to poke the GraphQL API with these contracts installed, then you can use docker-compose to provision a local chain, cog-services and have the contracts deployed to it:

```
docker-compose up --build
```

The API explorer will be available at http://localhost:3080

The chain RPC endpoint will be available at http://localhost:3045

