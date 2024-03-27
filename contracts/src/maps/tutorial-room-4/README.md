# Downstream Game Creation Tutorial 4

## Aim
We will follow the steps below to learn about 
- Changing tile colours
- Changing unit model
- Billboards
- Custom plugin UI

Once complete, your map should something look like this:

<img src="./readme-images/step0.png" width=600>

# 1. Setup
Follow steps 1 through 4 of `tutorial-room-1` to get started. This will walk you through:
- Deploying the game
- Spawning a unit
- Creating a map *
- Deploying new tiles

https://github.com/playmint/ds/blob/main/contracts/src/maps/tutorial-room-1/README.md

\* The only change we want to make to these steps is in _Creating a map_. As this is the next room in the tutorial series, we will be creating our map at a different angle so it doesn't overlap with another tutorial room.

<img src="./readme-images/step1.png" width=600>

## Let's create the files
### YAML
- DiscoCentre.yaml
```yaml
---
kind: BuildingKind
spec:
  category: custom
  name: Disco Centre
  description: Controls tile colours and unit visuals
  model: 03-06
  color: 2
  plugin:
    file: ./DiscoCentre.js
    alwaysActive: true
  materials:
  - name: Red Goo
    quantity: 10
  - name: Green Goo
    quantity: 10
  - name: Blue Goo
    quantity: 10
```
- DiscoBillboard.yaml
```yaml
---
kind: BuildingKind
spec:
  category: billboard
  name: Disco Billboard
  description: Beavers!
  model: monitor
  plugin:
    file: ./DiscoBillboard.js
    alwaysActive: true
  materials:
  - name: Red Goo
    quantity: 10
  - name: Green Goo
    quantity: 10
  - name: Blue Goo
    quantity: 10
```
- Buildings.yaml
```yaml
---
kind: Building
spec:
  name: Disco Centre
  location: [ 0, -8, 8 ]
  facingDirection: RIGHT

---
kind: Building
spec:
  name: Disco Billboard
  location: [ 3, -8, 5 ]
  facingDirection: LEFT
```
- Tiles.yaml
  - _Get tile output from tile-fabricator, or copy from our example_

# Changing Tile Colours
