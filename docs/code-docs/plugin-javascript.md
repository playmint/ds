> ℹ️ These code docs reference the Downstream API as viewed from a forge project with playmint/ds installed as a dependecy, like the ds-hammer-factory repository. You could also work with the ds repository directly.

# Javascript Plugin

Javascript code must be attached to a BuildingKind in order to control what is displayed when selecting the building, and provide controls to trigger the actions that are available when using the building.

The javascript must implement an Update function, which takes a GameState parameter and returns a description of the UI to display. 

Any buttons, that trigger functions defined in the same javascript code, can be included as part of the UI.

## Input

The plugin's `Update()` function is passed a parameter of type [`GameSate`](https://github.com/playmint/ds/blob/4b541a8e4c05d84a392c0cffec850d8b6949cd96/core/src/types.ts#L330) that you can use to inspect the current state of the game, discover what the player has selected and have your UI react accordingly. 

GameState is split into three top level objects: `player`, `world` and `selected`.


These docs are not a complete and up to date reference so the best way to see th state available is to use the **browser debug console**:

- While playing, hit F12 and turn on verbose console logging.
- Select Use
- Select a building
- Expand the log prefixed  `[0x3... send] `
        ![](../images/code-docs-input-state.png)
- Expand the data elements to explore what's in them
- Anything you find here is availabe in your Update function

### Use GameState in your building javascript

Some basics to get you going. 
The example buildings in the [ds-examples repo](https://github.com/playmint/ds-examples/tree/main/src) are good reference to0

- Extract main objects in function decleration

    >```javascript
    > export default function update({ selected, world, player }) {
    > ```

- The Mobile Unit using the building
    > ```javascript
    > const mobileUnit = selected.mobileUnit
    > ```
- The top bag belonging to the MobileUnit. 
    - *bags are an array of equpment objects where index 0 is bot guranteed to have key 0*
    - *the actual bag is a subobject of the bag (!)(unless we've renamed this nonsense by the time you read this)*
    > ```javascript
    > const topBag = mobileUnit.bags.find(b => b.key == 0).bag;
    > ```
- Find out if a bag contains a particular item. 
    - *item IDs could be constructed in code but its easier to get a list of items in the world via the grapgql explorer*
    - *bags contain a sub object, bag, which contains an array of 4 slots, each with a non-sequential key value*

    > ```javascript
    > const rubberDuckItemID = '0x6a7a67f00005c49200000000000000050000000500000005';
    > for (var i = 0; i < 4; i++) {
    >   if (topBag.slots[i].item.id === rubberDuckItemID)
    >       return true;
    > }
    > ```
- The current building
    > ```javascript
    > const building = selected.tiles[0].buidling;
    > ```
- The building input slots
    - *the inputs are a bag object, same as mobileUnit owned bags*
    - *The HammerFactory.js is a great example of how to use the input slots with the buildingKind crafting recipe*
    > ```javascript
    > const inputBag = selectedBuilding?.bags.find(b => b.key == 0).bag?
    >```

## Output

The Update function must return an object that controls what is displayed in the game UI for the building.

For reference, the code that parses this output is in `lib/ds/core/src/api/v1.ts`.

For an example output see the return statement of `src/HammerFactory.js`.

```jsx
// Currently unused
version: 1,

// List of screen area UI compoments to render.
// Currently only 1 component, of type 'buiding' is used.
components: [
{  
	//
	// diaplayed whenever building tile is selected in either Select ot Use mode
	//

		// Currently unused.
		version: 1,

		// Currently only 'building' is available.
		type: 'building',

		// Required but unused so anything will do.
		id: 'my-building',

		// Large title text.
		// Could be fixed or dynamic based on state. 
		title: 'Title text',

		// Smaller desription text. 
		// Could be fixed or dynamic based on state.
		summary: 'Smaller text',
	                       

	//  
	// diaplayed whenever building tile is selected in Use mode only
	//    

	// List of content to dispaly.
	// Only 1 element is displayed at a time. 
	// Element with id 'default' is initialy displayed.
	// Toggle buttons can show an element with a different id.
	content: [
	{
		//
		// Content example 1, default, using a toggle button and html form input
		//

		// At least one element must have id 'default'.
		// Other ids can be triggered with toggle buttons.
		id: 'default',  

		// Must be one of 'inline', 'popout' or 'dialog'.
		// Currently they all behave the same.
		type: 'inline', 

		// A string of HTML rendered inside a Form element.
		// This is passed though DOMPurify.santize before being rendered.
		// Tags that are stripped is teh default set here:
		// https://github.com/cure53/DOMPurify/wiki/Default-TAGs-ATTRIBUTEs-allow-list-&-blocklist#default-allow-listsblocklists
		html:           
			`<b>
				<input type="submit" value="Check in">
			</b>`,       

		// function, in this javascript file
		// called for any input of type 'submit' in the html above        
		submit:             
			() => {ds.log("checked in");},

		// list of buttons
		buttons: [
		{ 
			// Text shown on button 
			text: 'Next',

			// either 'action' or 'toggle'
			type: 'toggle',

			// id of content to switch to ('toggle' type only)
			content: 'sayhi',

			// is button disabled - can set this based on State
			disabled: false     
		},],
	},
	{
		//
		// Content example 2, sayhi, using an action button
		//

		id: 'sayhi',                
		type: 'inline',
		
		// list of buttons
		buttons: [
		{ 
			text: 'Say Hi',           
			type: 'action',
			// function, in this javascript file, called
			// when button is pressed ('action' type only)
			action:
				() => {ds.log("hi");},  
		},],
	},], // end of content list
},] // end of component list (currently always just 1)
```

## Downstream Commands

Any functions defined in your plugin and called from either an action button or an html form submission can makes use of special Downstream functions that have been explicitly exposed.

These are available via importing the `ds` object at the top of the plugin javascript file,

Currently `dispatch`, `encodeCall` and `log` are provided.

The source code that exposes these functions can be found `lib/ds/core/src/plugins.ts`, `loadPlugin().`

The dispatch function is how plugins can send solidity transactions to the Downstream game on-chain. See the [Action Dispatching](https://www.notion.so/Code-Docs-7e6c8e839ec141e3b88c16a3b36bfb79?pvs=21) section above.

```jsx
import ds from 'downstream';

// Dispatch an action to the Downstream game on the blockchain.
// These use the current session for the current player.
// Typically you will want to call your building's solidity use() function,
// which is done by dispatching the BUILDING_USE action.
ds.dispatch(
      {
          name: 'BUILDING_USE',
          args: [selected.tiles[0].building.id, selected.mobileUnit.id, []]
      },
  );

// render a text message to the log area of the game's UI
ds.log("Called my building's use() function in the BuildingKind contract");

// helper to abi encode values for a payload that you can abi.decode in your contract code
// use this to pass arbitrary parameters to your BuildingKind contract's use() function.
// See the ds-examples repo and the PostOffice building for an example of this in action
const payload = ds.encodeCall("function values(uint256 aNumber, string memory aString)", [1, "example"]);
ds.dispatch({
      name: "BUILDING_USE",
      args: [selected.tiles[0].building.id, selected.mobileUnit.id, payload],
    });
```

## Default Crafting Behaviour

If your building kind defines Inputs and an Output, then the UI will show appropriate item slots as part of you plugin UI by default.

![Default Building Craft UI](../images/default-craft-ui.png)

There is no need for plugin code to handle these inputs, however it is up to you to call dispatch the CRAFT action, either via the solidity use() function for via dispatching the action directly from the javascript.
