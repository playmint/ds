# Downstream Game Creation Tutorial 1
## Aim

We will follow the steps below to create a simple downstream map, with your own tile layout and your own factory building.

Once complete, you will have used the core Downstream tools to create a map that looks like this when played:

<a href="https://drive.google.com/file/d/1C6Zou1v_ad8OlvZjKmixuvBBLpVJvkRZ/view?usp=drive_link"><img src="./readme-images/screenshot.png" width=300></a>

## Prerequisites
- Have set up Metamask
- Have claimed a Downstream Redstone Zone
Follow the [Redstone Guide](../../../../tutorial/REDSTONEGUIDE.md) for more information

## 1. Create a map

There is no where for the Unit to go so we will now expand the world by creating some tiles.

First, open the the **tile-fabricator**, by opening a web browser and navigating to [tile-fabricator](http://redstone.downstream.game/tile-fabricator).

Now, draw a map design:
- Left click each tile that you want on your map.
- Zoom in and out with mouse scroll.
- To remove a tile, select **UNDISCOVERED TILE** from the brush drop down and left click to remove tiles.
- Draw a map that looks like this:

<img src="./readme-images/step3.png" width=200>

Once you are happy, export the tiles manifest file:
- Select **Export**.
- Find the downloaded file. It will be named something like `20d6a4ed-bb78-4774-8c0a-50c28451a380.yml`.


Finally, create a new folder in your desktop. This folder is your 'map' and will contain manifests defining tiles, buildings, items and more. For now we'll just copy the new tiles in:
- Create a folder like /Tutorial1Map
- Copy the exported tiles manifest into the folder.
- Rename it to 'Locations.yaml'.

## 2. Deploy the new tiles

We will use the Downstream CLI to deploy our newly created tiles to our local Downstream instance.

First, install the CLI. From a terminal run:
```bash
npm i -g @playmint/ds-cli
```
Check it is installed from any terminal folder by running:
```bash
ds help
```

Finally, run the command to deploy your map:
In a terminal at your new folder run the following, where `<zone-number>` is your Zone number:
```bash
ds apply -n redstone -z <zone-number> -f Locations.yaml
```

Note: If using Windows you get the error "running scripts is disabled on this system", open Powershell as an Administrator and run `Set-ExecutionPolicy  RemoteSigned`

Running the command will open your default broswer and ask you to sign a transaction in Metamask. This will confirm your identity and verify ownership of your zone.

Once you have accepted the Metamask prompts, return to your terminal and the output should display a series of ✅s for each tile that is deployed.

<img src="./readme-images/step4c.png" width=200>

Browse to your Zone on [redstone.downstream.game](redstone.downstream.game) and you should see your newly created map and be able to move your Unit around it!

<img src="./readme-images/step4d.png" width=200>


## 3. Create a new type of building

The map is currently empty and there are no buildings to build. So we are going to create a new kind of 'Factory' building that crafts a new kind of item.

First, open the the **building-fabricator**, by opening a web browser and navigating to the [building-fabricator](http://redstone.downstream.game/building-fabricator).

You should see a page like this:

<img src="./readme-images/step5a.png" width=200>

Now give the building a name and description.

Then, click on the **Output** tab and define the item that can be crafted by this factory:
- Select an icon.
- Choose a name.

You can change the appearance of the building by clicking on the arrows and colour squares.

<img src="./readme-images/step5b.png" width=200>

Once you are happy, export the building source code:
- Select **Export**.
- Find the downloaded zip file. It will be named something like `BasicFactory.zip`.
- Extract the files to the same folder as Locations.yaml.

You should now have a folder that looks this:

<img src="./readme-images/step5c.png" width=200>

## 4. Deploy the new type of building

We will use the Downstream CLI to deploy our newly created building to our local Downstream instance.

Deploying the building is the same as the tiles manifest but passing BasicFactory.yaml instead of Locations.yaml: 
- In a terminal in the folder with your exported building source.
- `ds apply -n redstone -z <zone-number> -f BasicFactory.yaml`

Again, metamask will ask you to sign a transaction and then you should see the terminal output display for the building kind and item kind defined by your new factory:

<img src="./readme-images/step6a.png" width=200>

This type of building now exists in our local instance of Downstream, which means it is available for Units to build on the map:
- Browse to your zone on [https://redstone.downstream.game](redstone.downstream.game).
- Select the build action.
- Choose your new building type from the drop down list.
- Confirm.

You should now have an instance of your building deployed to the map!

<img src="./readme-images/step6b.png" width=200>


## 5. Add some decorations

There are plenty for examples of pre-made building kinds in the ds repository that can be copy and pasted into your map folder.

We will add some decorative blocking buildings to your map and see how everything in the map folder can be deployed at once.

First copy the [blockers.yaml](./blockers.yaml) to your map folder.

Now, use the [tile-fabricator](http://redstone.downstream.game/tile-fabricator) to add some blockers to your map:
- Press the **import** button, navigate to your map folder, and select blockers.yaml.
- New building types will now be available in the **Brush** drop done.

<img src="./readme-images/step7a.png" width=200>

- Choose a building type and place instances with left mouse click.

<img src="./readme-images/step7b.png" width=200>

- When you're happy, press the **export** button.
- Replace your old Locations.yaml with the new downloaded manifest.

## 6. Deploy the whole map folder

To complete the tutorial, we're going to deploy your whole map folder together.

Now you can `ds apply` the whole map folder by passing the `-R` flag and the folder path. At a terminal In your map folder run:
```bash
ds apply -n redstone -z <zone-number> -k <private-key> -R -f .
```

Browsing back to the game, you should now see your new map.

<img src="./readme-images/screenshot.png" width=300>
