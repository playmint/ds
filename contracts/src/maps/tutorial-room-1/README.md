# Downstream Game Building Tutorial 1
## Fabricators and CLI

We will follow the steps below to create a simple downstream map, with your own tile layout and your own factory building.

Once complete, you will have used the core Downstream tools to create a map that looks like this when played:

<img src="./screenshot.png" width=300>

# 0. Prerequisites
- This repository cloned to your desktop. (Instructions in the top [readme](../../../../README.md).)
- [Docker Desktop](https://docs.docker.com/get-docker/)
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

# 1. Deploy the game

First, deploy an instance of Downstream locally using Docker.

- From a terminal in the repository root run:
- `docker compose up --pull=always`

After some time (this could take up to 5 minutes), you should see "ready" in the terminal output:

    contracts-1  | +-------+
    contracts-1  | | ready |
    contracts-1  | +-------+
    
You can now open a web browser and navigate to [http://localhost:3000] to load the game.

You should see a blue world, with a single hex tile in the center and the Welcome to Downstream dialogue box:

<img src="./step1.png" width=200>

# 2. Spawn a Unit

First click the "Connect Wallet" button.
Then, select "Burner".

<img src="./step2a.png" width=200>

You can now click "Spawn Unit" and you should see your Unit on the center tile:


<img src="./step2b.png" width=200>


# 3. Create a map

There is no where for the Unit to go so we will now expand the world by creating a 'map' of tiles.

First, open the the tile-fabricator, by opening a web browser and navigating to [http://localhost:3000/tile-fabricator].

Now draw a map design:
- Left click each tile that you want on your map.
- Zoom in and out with mouse scroll.
- To remove a tile, select **UNDISCOVERED TILE** from the brush drop down and left click to remove tiles.
- Draw a map that looks like this:

<img src="./step3.png" width=200>

Once you are happy, export the tiles manifest file:
- Select **Export**.
- Find the downloaded file. It will be named something like `20d6a4ed-bb78-4774-8c0a-50c28451a380.yml`.
- Copy it to a new folder on your desktop.
- Rename it to 'tiles.yaml'.

# 4. Deploy the new map

We will use the Downstream CLI to deploy our newly created map to our locally running Downstream.

First, install the CLI
- From a terminal run
- `npm i -g @playmint-cli`
- Check it is installed from any terminal folder by running
- `ds help`

Now copy your Burner private key from Downstream:
- Browse to [localhost:3000]([http://localhost:3000]).
- Click the player icon at the top left.

<img src="./step4a.png" width=200>

- Click **show**

<img src="./step4b.png" width=200>

- Highlight and copy the key.

Finally, run the command to deploy your map:
- In a terminal at your new folder run the following
- (where `<private-key>` can be pasted from the one you just copied)
- `ds apply -n local -k 0xf711006813fec6c9ac3335ede75affa70417208d6a79ce1f531a8fe5fadea9a0 -f tiles.yaml`

You should see the terminal output display series of ✅s for each tile that is deployed.

<img src="./step4c.png" width=200>

Browse to [localhost:3000]([http://localhost:3000]) and you should see your newly created map and be able to move your Unit around it!

<img src="./step4d.png" width=200>



# 5. Create a new type building

The map is currently empty and there are no buildings to build. So we are going to create a new type of 'Factory' building that crafts a new kind of item.

First, open the the building-fabricator, by opening a web browser and navigating to [http://localhost:3000/building-fabricator].

You should see a page like this:

<img src="./step5a.png" width=200>

Now give the building a name and description.

Then, click on the **Output** tab and define the item that can be crafted by this factory:
- Select an icon
- Choose a name

You can change the appearance of the building by clicking on the arrows and colour squares until.

<img src="./step5b.png" width=200>

Once you are happy, export the building source code:
- Select **Export**.
- Find the downloaded zip file. It will be named something like `BasicFactory.zip`.
- Extract the files to the same folder as tiles.yaml.

You should now have a folder that looks this:

<img src="./step5c.png" width=200>

# 6. Deploy the new type of building

We will use the Downstream CLI to deploy our newly created building to our locally running Downstream.

Deploying the building is the same as the tiles map, passing BasicFactory.yaml instead of tiles.yaml: 
- In a terminal in the folder with your exported building source.
- (using the same `<private-key>` as above)
- `ds apply -n local -k <private-key>> -f BasicFactory.yaml`

You should see the terminal output display for the building kind and item kind defined by your new factory:

<img src="./step6a.png" width=200>

This type of building now exists in our local instance of Downstream, which means it is available for Units to build on the map. You can do this now:
- Browse to [localhost:3000]([http://localhost:3000]).
- Select the build action.
- Choose your new building type from the drop down list.
- Confirm.

You should now have an instance of your building deployed to the map!

<img src="./step6b.png" width=200>


# 7. Add some decorations

There are plenty for examples of pre-made building kinds in the ds repository that can be copy and pasted into your map folder.

We will add some decorative blocking buildings to your map and see how everything in the map folder can be deployed at once.

First copy the [blockers.yaml](../../common/Decorations/blockers.yaml) to your map folder.

Now, use the [tile-fabricator](http://localhost:3000/tile-fabricator) to add some blockers to your map:
- Press the **import** button, navigate to your map folder, and select blockers.yaml.
- New building types will now be available in the **Brush** drop done.

<img src="./step7a.png" width=200>

- Choose a building type and place instances with left mouse click.

<img src="./step7b.png" width=200>

- When you're happy, export.
- Replace your old tiles.yaml with the new downloaded manifest.

Finally, deploy the new map. This time using '-R' option to deploy a whole folder of manifest .yaml files:
`ds apply -n local -k <private-key> -R -f .`

Browsing back to the game, you should now see your new map.

<img src="./step7c.png" width=200>

Note, that if you added your factory in the tile-fabricator you may now have two factories on the map.

# 8. Redeploy your map from scratch

We've been adding to the map bit by bit but your new map folder represents a whole, deployable Downstream map.

To complete this tutorial:
- Stop docker with `ctrl-c` in your Docker terminal.
- restart docker with `docker compose up`.
- Once you see "ready" browse to the game and check you have a single tile world.
- Finally, deploy your new map from your map folder.
- `ds apply -n local -k <private-key> -R -f .`

You should now have a Downstream world that looks something like the one you get if you deploy _this_ folder:

<img src="./screenshot.png" width=300>
