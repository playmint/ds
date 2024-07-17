# A Quick Start Guide for Downstream Redstone

## Setting up to work on your very own Zone

### 1. Setting up a wallet and claiming a Zone

Downstream is deployed to Redstone, a mainnet L2! The following steps will teach you how to set up Metamask, purchase ETH, bridge it to Redstone and claim your Downstream Zone! 

1. You will need to install and set up Metamask. [You can follow his guide to get set up!](https://support.metamask.io/getting-started/getting-started-with-metamask/)

2. Once you have that set up, you will need to add the Redstone network to your Metamask. 

&nbsp; &nbsp; &nbsp; &nbsp; [You can find Redstone's network information here](https://redstone.xyz/docs/network-info)

&nbsp; &nbsp; &nbsp; &nbsp; [You can find a guide to adding a new network here](https://support.metamask.io/networks-and-sidechains/managing-networks/how-to-add-a-custom-network-rpc/)

3. You will need to bridge some ETH from Ethereum mainnet to Redstone. A zone costs 0.001 ETH but you will likely need to purchase more to cover the gas costs of bridging the ETH. [You can find out how to buy ETH here!](https://portfolio.metamask.io/)

4. Once you have your ETH, you can bridge it to Redstone [here.](https://redstone.xyz/deposit)

### 2. Claiming your Zone

Finally! Time to claim your zone!

Navigate to [Downstream](https://redstone.downstream.game/), connect your wallet, sign the requested transaction and select the "CLAIM ZONE" button.

__Please Note:__ If your Metamask is currently set to Ethereum Mainnet, you should be asked to switch networks to Redstone

If you have followed the steps correctly, you should now be the proud owner of a Downstream Redstone Zone!

### 3. Naming your map and adding a picture

__Please note:__ Remember your zone number. The zone's name by default will contain the number or if you have changed the name, it can be found in the URL on your Zone page

Once you have your zone, you can select the settings cog in the top left of the screen and you will be presented with the settings popup.

<img src="images/adminPanel.png" width="200">

Here, you can type a Zone name, Zone description and add an image. Adding an image is as simple as finding an image online, copying it's URL and pasting it into the text box! Press the Apply button and it will commit the changes.


## Creating your first Map

### 1. Install ds-cli

In order to deploy a map to your zone, you will need to download `ds-cli`, you can do that by installing [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) or [npm Windows](https://nodejs.org/en/download/) and then, open your Terminal or CMD window and run `npm install -g @playmint/ds-cli` to install  `ds-cli`.

To test if the tool has been correctly installed, type `ds help` into your command line and make sure it displays the help message.


### 2. Draw a map and export your yaml

Navigate to the [Tile Fabricator](https://redstone.downstream.game/tile-fabricator) and start painting the shape of your map!

<img src="images/tile-fabricator.png" width="200">

Once you are happy, press the __Export__ button in the top right menu and you will download a map `.yml` file

### 3. Use ds-cli to deploy it

Open your platform's command line interface and navigate to the folder containing your map `.yaml` file.

Run the following `ds-cli` command and replace `<zone-number>` with your zone number: `ds apply -n redstone -z <zone-number> -R -f .`

For example, if your zone ID is 1, then the command will look like this: `ds apply -n redstone -z 1 -R -f .`

The cli tool will then open your default browser and ask you to sign the transaction in Metamask. This will not cost you anything!

Once the tool has deployed the map, navigate back to your Zone and check out your map!


## Deploying your first building kind

### 1. The Building Fabricator
Browse to [redstone.downstream.game/building-fabricator](https://redstone.downstream.game/building-fabricator)

<img src="images/building-fabricator.png" width="200">

The Building Fabricator allows you to deploy buildings and items to Downstream without having to leave the game! Once configured hit the __Deploy__ button.

For the next step, hit the __Export__ button to get the building's source files and move them into the same folder as your `map.yaml` file from earlier

### 2. Import your building into the Tile Fabricator and adding it to your map

If you navigate back to the Tile Fabricator, you will notice an __import__ button. This will bring up your system's file explorer. If you navigate to the folder containing your building's source files, select them and confirm the dialogue, the building you have deployed will be added to the __Brush__ drop down!

<img src="images/tileFabPanel.png" width="200">

If you select your building and add it to the map and then follow the same export and apply steps above, you will be able to redeploy your map and it will now contain your new building!

----------------------------------

## Further Reading

Check out the [Redstone Cheat Sheet](./RSCHEATSHEET.md) for more detail on the process outlined above

Check out the [Local Dev Tutorials](./ADVANCEDTUTORIALS.md) to set up your own local instance of Downstream and learn a lot more about how everything is built and how you can start building your own games!
