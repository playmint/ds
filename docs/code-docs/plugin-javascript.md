> ℹ️ These code docs reference the Downstream API as viewed from a forge project with playmint/ds installed as a dependecy, like the ds-hammer-factory repository. You could also work with the ds repository directly.

# Javascript Plugin

Javascript code must be attached to a BuildingKind in order to control what is displayed when selecting the building, and provide controls to trigger the actions that are available when using the building.

The javascript must implement an Update function, which takes a State parameter and returns a description of the UI to display. 

Any buttons, that trigger functions defined in the same javascript code, can be included as part of the UI.

## Input

The Update function is passed a parameter of type GameState. This object has three top level sub objects: `Player`, `World` and `Selection`.

****************Player**************** contains data about the player associated with the current session, including wallet address and mobileUnits they own.

************World************ contains summary information about everything in the Downstream world including ids for constructed buildings and discovered tiles. Not all of the world state is available but all state related to currently selected tiles is available from the Selection object.

********************Selection******************** contains all state related to the currently selected MobileUnit, currently selected tile(s) and the intent (one of the Select, Construct, Scout, Move and Use modes) of the player.

## Help inspecting the shape of data

While playing, hit F12 and turn on verbose console logging. Each time you select a building on the map you will get an output of all the state that is being sent to that buildings javascript plugin. Expanding the elements of these data objects is a good way to see what data is available when writing your own plugin.

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
import ds from 'dawnseekers';

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

// todo - example of encodeCall
ds.encodeCall();
```

## Default Crafting Behaviour

If your building kind defines Inputs and an Output, then the UI will show appropriate item slots as part of you plugin UI by default.

![Default Building Craft UI](../images/default-craft-ui.png)

There is no need for plugin code to handle these inputs, however it is up to you to call dispatch the CRAFT action, either via the solidity use() function for via dispatching the action directly from the javascript.
