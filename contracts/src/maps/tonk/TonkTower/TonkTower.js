import ds from 'downstream';

const MIN_NUMBER_PLAYERS = 2;
let game, players, tonkPlayer;

let wants_to_join = false;
let wants_to_start = false;
let cast_vote = false;
let saved_vote_id = null;

 let ENDPOINT = "http://localhost:8082"
//let ENDPOINT = "https://ds-api.tonk.gg"

async function getGame() {
    try {
        let response = await fetch(`${ENDPOINT}/game`);
        let raw = await response.text();
        return JSON.parse(raw);
    } catch (e) {
        console.log(e);
        return ({
            status: "GameServerDown"
        })
    }
}

async function getPlayers(gameId, playerId) {
    // fetch("localhost:8082/game/9d19e34892d546bea2fbeba08be9e573/player", requestOptions)
    // .then(response => response.text())
    // .then(result => console.log(result))
    // .catch(error => console.log('error', error));

    try {
        let response = await fetch(`${ENDPOINT}/game/${gameId}/player?player_id=${playerId}`);
        let raw = await response.text();
        return JSON.parse(raw);
    } catch (e) {
        console.log(e);
        return (`[]`)
    }
}

async function requestStart() {
    // var myHeaders = new Headers();
    // myHeaders.append("Content-Type", "application/json");

    var requestOptions = {
        method: 'POST',
    };

    try {
        let response = await fetch(`${ENDPOINT}/game`, requestOptions)
        let text = await response.text();
        console.log(text);
    } catch (e) {
        console.log(e);
    }
}

async function requestJoin(gameId, playerId, secretKey) {
    // var myHeaders = new Headers();
    // myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
        "id": playerId,
    });

    var requestOptions = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Sec-Fetch-Mode": "cors"
        },
        mode: "cors",
        body: raw,
    };

    try {
        let response = await fetch(`${ENDPOINT}/game/${gameId}/player`, requestOptions)
        let text = await response.text();
        console.log(text);
    } catch (e) {
        console.log(e);
    }
}

async function getRoundResult(game, round) {
    //TODO implement 
    try {
        let response = await fetch(`${ENDPOINT}/game/result/${round}`)
        let text = await response.text();
        return JSON.parse(text);
    } catch (e) {
        console.log(e);
    }
}

async function sendVote(candidateId, player) {
    var raw = JSON.stringify({
        candidate: {
            id: candidateId
        }
    });

    var requestOptions = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Sec-Fetch-Mode": "cors"
        },
        mode: "cors",
        body: raw,
    };

    try {
        let response = await fetch(`${ENDPOINT}/vote?player_id=${player.id}&secret_key=fff`, requestOptions)
        let text = await response.text();
        console.log(text);
    } catch (e) {
        console.log(e);
    }
}

async function getPlayer(id) {
    try {
        let response = await fetch(`${ENDPOINT}/player/${id}`)
        let raw = await response.text();
        return JSON.parse(raw);
    } catch (e) {
        console.error(e);
    }
}

function gameResultToText(game) {
    const { win_result, corrupted_players } = game;
    if (win_result == "Thuggery") {
        return "The Brainwashed units have outnumbered the sentient units."
    } else if (win_result == "Democracy") {
        return "The Sentient have won because they voted out all the Brainwashed." 
    } else if (win_result == "Perfection") {
        return "The Sentient have won because they completed all their tasks in one round."
    } else if (win_result == "Armageddon") {
        return "All units have destroyed each other. There is no one left."
    } else {
        return "The game is over, but I don't know why!"
    }
}
function reasonToPlaintext(p) {
    console.log(p);
    const { reason, player } = p; 
    if (reason == "BuggedOut") {
        return `has been eliminated and ${player.role == "Bugged" ? 'was an evil unit' : 'was a noble unit'}`;
    } else if (reason == "VotedOut") {
        return `has been voted out and ${player.role == "Bugged" ? 'was an evil unit' : 'was a noble unit'}`;
    } else if (reason == "Inaction") {
        return `was ${player.role == "Bugged" ? 'an evil unit' : 'a noble unit'} and has been eliminated due to inaction`
    } else {
        return "has been swallowed by an error!"
    }
}

function findBags(world, mobileUnit) {
    return world.bags.filter((b) => b.equipee && b.equipee.node.id == mobileUnit.id);
}

function getWarningText(game, players, has_tonk) {
    if (!has_tonk) {
        return "You need to craft a tonk to join";
    }
    switch(game.status) {
        case "Lobby": {
            if (players.length < 2) {
                return "Game can start when more than 2 units join";
            }
        }
        case "Tasks": {
            return "Your crafted tonk will show you instructions."
        }
        case "Vote": {
            if (tonkPlayer.used_action === "Voted") {
                return "You have voted. Waiting for results..."
            } else {
                return "Select a unit to eliminate."
            }
        }
        case "VoteResult": {
            return ""
        }
        case "End": {
            return gameResultToText(game)
        }
        default: {
            return ""
        }
    }
}

function gameStatusText(game) {
    const { status, win_result } = game;
    switch(status) {
        case "Lobby": {
            return "We are actively looking for new units to enlist.";
        }
        case "Tasks": {
            return "Our units are on active duty. Good luck units!";
        }
        case "Vote": {
            return "We are deliberating certain internal problems.";
        }
        case "VoteResult": {
            return "We have concluded all deliberations.";
        }
        case "End": {
            if (win_result === "Thuggery") {
                return "The Brainwashed have taken over."
            } else {
                return "The Sentient have landed a major victory."
            }
        }
        default: {
            return ""
        }
    }
}

// export default async function update(params) {
//     const { selected, player, world } = params; 

//     // console.log(params);
//     const { mobileUnit } = selected || {};
//     // const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
//     // const selectedBuilding = selectedTile && selectedTile.building ? selectedTile.building : undefined;
//     // const selectedEngineer = mobileUnit;
//     // const inputBag = selectedBuilding && selectedBuilding.bags.find(b => b.key == 0).bag;
//     // const canCraftTonk = inputBag && inputBag.slots.length == 2 && inputBag.slots.every(slot => slot.balance > 0) && selectedEngineer;
//     console.log("building id: ", selected.mapElement.id);
//     console.log("selected coords: ", selected.tiles[0].coords);
//     // console.log(player);
//     const buildingId = selected.mapElement.id;

//     if (!mobileUnit || (mobileUnit && mobileUnit.owner.id !== player.id)) {
//         return {
//             version: 1,
//             components: [
//                 {
//                     id: 'tonk-tower',
//                     type: 'building',
//                     content: [{
//                         id: 'default',
//                         type: 'inline',
//                         html: "",
//                         buttons: [],
//                     }],
//                 },
//             ],
//         }
//     }

//     game = await getGame();
//     players = await getPlayers(game.id, player.id);


//     if (wants_to_join) {
//         try {
//             await requestJoin(game.id, player.id)
//             wants_to_join = false;
//         } catch (e) {
//             console.log(e)
//         }
//     }

//     if (wants_to_start) {
//         try {
//             await requestStart()
//             wants_to_start = false;
//         } catch (e) {
//             console.log(e)
//         }
//     }
//     const joinGame = () => {
//         wants_to_join = true;
//     }

//     const startGame = () => {
//         wants_to_start = true;
//     }

//     const craft = () => {
//         if (!mobileUnit) {
//             ds.log('no selected engineer');
//             return;
//         }
//         if (!buildingId) {
//             ds.log('no selected building');
//             return;
//         }

//         ds.dispatch(
//             {
//                 name: 'BUILDING_USE',
//                 args: [buildingId, mobileUnit.id, []]
//             },
//         );

//         ds.log('Tonk!');
//     };

//     if (cast_vote) {
//         await sendVote(saved_vote_id, player);
//         cast_vote = false;
//         saved_vote_id = null;
//     }


//     const onCastVote = (values) => {
//         cast_vote = true;
//         saved_vote_id = values.vote;
//     };

//     // console.log(world, mobileUnit);
//     let bags = findBags(world, mobileUnit);

//     const has_tonk = bags[0].slots.findIndex(b => b.item && b.item.name.value == 'Tonk') >= 0 || bags[1].slots.findIndex(b => b.item && b.item.name.value == 'Tonk') >= 0
//     const player_is_in_game = players ? players.findIndex(p => p.id == player.id) >= 0 : [];

//     let html = ``;
//     let buttons = [];
//     let submit;
//     if (game.status == "Lobby") {
//         html =` 
//             <p> Number of players waiting in the lobby: ${players.length} </p>
//             <br/>
//             ${players.length < MIN_NUMBER_PLAYERS ? `<p>Game can start when ${MIN_NUMBER_PLAYERS - players.length} more players join the lobby</p>`: "Game is ready to start"}
//             <hr />
//         `
//             if (!player_is_in_game && !!has_tonk && game.status == "Lobby") {
//             buttons.push({ text: 'Join Game', type: 'action', action: joinGame, disabled: !has_tonk });
//         }
//         if (players.length >= MIN_NUMBER_PLAYERS && player_is_in_game) {
//             buttons.push({ text: 'Start Game', type: 'action', action: startGame, disabled: !has_tonk || !player_is_in_game });
//         }
//     } else if (game.status == "Tasks") {
//         html = `
//             <h3> Complete the tasks </h3>
//             <br/>
//             <h3> Time remaining: ${game.time.timer} </h3>
//             <br/>
//             <p> Players have been assigned their tasks </p>
//             `;
//     } else if (game.status == "Vote") {
//         // fetch round result for task round
//         let roundResult = await getRoundResult(game, game.time.round - 1);
//         tonkPlayer = await getPlayer(player.id);
//         html = `
//             <h3> Voting in session </h3>
//             <br/>
//             ${roundResult.eliminated && roundResult.eliminated.length > 0 ? "<p> Player deletion report: </p><br/>" : "<p>Somehow, you all have avoided deletion.</p>"}
//             ${roundResult.eliminated && roundResult.eliminated.map((p) => `<p>${p.player.display_name} ${reasonToPlaintext(p)}</p>`)}
//             <br/>
//             <p> Number of tasks completed: ${roundResult.tasks_completed ? roundResult.tasks_completed.length : 0}</p>
//             <br/>
//             <br/>
//             <p> Cast your vote to identify and eliminate the evil units </p>
//             <br />
//             <label>VOTE</label>
//             `;
        
//         if (player_is_in_game) {
//             if (tonkPlayer.used_action == "Voted") {
//                 html += `
//                     <p> You have cast your vote </p>
//                 `
//             } else {
//                 // values will be returned as {vote: id}
//                 html += `
//                 <div>
//                 <select name="vote" style="width: 100%">
//                     `
//                 html += players.map((p) => {
//                     if (p.id == tonkPlayer.id || p.role == "Bugged") {
//                         return ""
//                     } else {
//                         return `<option value=${p.id}>${p.display_name}</option>`;
//                     }
//                 });
//                 html += "</select>"
//                 html += `
//                     </div>
//                     <br/>
//                     <div>
//                         <button type="submit" style="width:100%; padding:5px; border-radius: 10px;">Cast Vote</button>
//                     </div>
//                 `
//                 submit = onCastVote;
//             }
//         }
//     } else if (game.status == "VoteResult") {
//         // fetch round result for  round
//         let roundResult = await getRoundResult(game, game.time.round);
//         html = `
//             <h3> Voting is over! </h3>
//             <br/>
//             ${roundResult.eliminated && roundResult.eliminated.length > 0 ? "<p> Player deletion report: </p><br/>" : "<p>Somehow, you all have avoided deletion.</p><br/>"}
//             ${roundResult.eliminated && roundResult.eliminated.map((p) => `<p>${p.player.display_name} ${reasonToPlaintext(p)}</p>`)}
//         `;

//     } else if (game.status == "End") {
//         // display the names of the winners
//         html = `
//             <h3> Game Over! </h3>
//             <p> ${gameResultToText(game)} </p>
//             <br/>
//             ${players.length == 0 ? (
//                 ""
//             ) : (
//                 "<p> I'm happy to report the following units have avoided deletion: "
//             )}
//             ${players.map((p, i) => (i == 0 ? "" : ", ") + `${p.display_name}`)}.
//         `;
//     }

//     if (game.status == "GameServerDown") {
//         // Display error about game server
//         html = `
//             <p>The game server is down and thus the gods of Tonk Attack require a sacrifice to continue playing this game<p>
//         `;
//     }

//     if (!has_tonk) {
//         buttons.push({ text: 'Craft Tonk', type: 'action', action: craft, disabled: false })
//         html+=`
//             <p> You need a Tonk to play the game </p>
//             <br />
//         `;
//     }


//     return {
//         version: 1,
//         components: [
//             {
//                 id: 'tonk-tower',
//                 type: 'building',
//                 content: [{
//                     id: 'default',
//                     type: 'inline',
//                     html: html,
//                     buttons: buttons,
//                     submit: submit
//                 }],
//             },
//         ],
//     };
// }
function inlineStyle(style) {
    return Object.keys(style).map(key => {
        return `${key}:${style[key]}`
    }).join(';');
} 

const containerStyle = {
    width: "100%",
}
const rowStyle = {
    display: "block",
    width: "100%",
    height: "120px",
    "margin-top": "12px"
}
const labelStyle = {
    "font-family": "Recursive, monospace",
    "font-size": "18px",
    "font-weight": "700",
    margin: 0,
    padding: 0,
    "max-width": "130px",
}
const boxAndLabelStyle = {
    margin: 0,
    padding: 0,
    display: "inline-block",
}
const boxStyle = {
    display: "inline-block",
    "border-radius": "5px",
    background: "#EDEBF6",
    border: "1px solid #A7A3AF",
    "box-shadow": "-1px -1px 0px 0px #EDEBF6",
    margin: "5px",
}
const activeUnitsStyle = {
    "min-width": "119px",
    "max-width": "119px",
    "min-height": "100px",
    "max-height": "100px",
    "overflow-y": "scroll",
    padding: "5px",
}

const timeStyle = {
    "min-width": "80px",
    "max-width": "80px",
    "min-height": "75px",
    "max-height": "75px",
}

const eliminatedStyle = {
    "min-width": "119px",
    "max-width": "119px",
    "min-height": "100px",
    "max-height": "100px",
    "overflow-y": "scroll",
    "padding": "5px"
}

const statusStyle = {
    "min-width": "157px",
    "max-width": "157px",
    "min-height": "75px",
    "max-height": "75px",
}

const entryStyle = {
    "font-weight": 800,
    "font-size": "14px",
    margin: "5px",
}

const timeTextStyle = {
    "font-weight": 800,
    "font-size": "28px",
    color: "#FB7001",
    margin: "15px 0",
    padding: 0,
    "text-align": "center"
}

const dividerStyle = {
    background: "#F5F1F8",
    "box-shadow": "0px 2px 4px 0px rgba(0,0,0,0.25) inset",
    width: "100%",
    height: "2px",
    "max-height": "2px",
    "margin": "5px 0 5px 0",
}

const selectStyle = {
    width: "100%",
    height: "50px",
}

const warningTextStyle = {
    color: "#A19BAD",
    "font-family": "Recursive, monospace",
    "font-size": "18px",
    "font-weight": "500",
    "text-align": "center"
}
const colorOrange = {
    color: "#FB7001",
}

const buttonStyle = {
    width: "100%",
    height: "5rem",
    "font-size": "1.6rem",
    "color": "#FB7001",
    background: "linear-gradient(#E4E1EB,#F7F5FA 35%)",
    "font-weight": "800",
    padding: "0.5rem 1.2rem 0 0.8rem",
    "border-radius": "0.8rem",
    display: "block",
    "margin-top": "0.5rem"
}

const screenContainerStyle = {
    "min-width": "80px",
    "max-width": "80px",
    "min-height": "75px",
    "max-height": "75px",
    "border-radius": "5px",
    overflow: "hidden",
    background: "black",
    position: "relative",
    margin: "32px 0 0 10px",
}

const screenGradientStyle = {
    "min-width": "80px",
    "max-width": "80px",
    "min-height": "75px",
    "max-height": "75px",
    position: "absolute",
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.12) 5.22%, rgba(255, 255, 255, 0.08) 14.06%, rgba(255, 255, 255, 0.00) 100%)"
}

const lowerGlareStyle = {
    position: "absolute",
    top: "41px",
    transform: "rotate(180deg)",
    "min-width": "80px",
    "max-width": "80px",
    height: "34px",
    "max-height": "34px",
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.30) 5.22%, rgba(255, 255, 255, 0.23) 21.88%, rgba(255, 255, 255, 0.00) 100%)",
    filter: "blur(7px)",
}
const upperGlareStyle = {
    "min-width": "80px",
    "max-width": "80px",
    height: "34px",
    "max-height": "34px",
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.30) 5.22%, rgba(255, 255, 255, 0.23) 21.88%, rgba(255, 255, 255, 0.00) 100%)",
    filter: "blur(7px)",
}

const logoStyle = {
    width: "80px",
    top: 0,
    position: "absolute",
}


export function renderVote(players, tonkPlayer) {
    console.log(players);
    console.log(tonkPlayer);
    return `
    <div style="${inlineStyle({...rowStyle, "margin-top": "25px"})}">
        <div style="${inlineStyle({...boxAndLabelStyle, display: "block"})}">
            <p style="${inlineStyle({...labelStyle, "max-width": "150px"})}">VOTE UNIT OUT</p>
            <select name="vote" style="${inlineStyle({...boxStyle, ...selectStyle})}">
                ${players.filter(p => p.id !== tonkPlayer.id && p.role !== "Bugged").map(p => {
                    return `
                        <option value="${p.id}">${p.display_name}</option>
                    `
                }).join("\n")}
            </select>
        </div>
        <div>
            <button type="submit" style="${inlineStyle(buttonStyle)}">Cast Vote</button>
        </div>
    </div>
    `
}

export function renderWarning(warningText) {
    return `
    <div style="${inlineStyle({...rowStyle, "height": "auto", "margin": "42px 0 25px 0", display: "flex", "align-items": "center", "justify-content": "center", "max-height": "220px"})}">
        <p style="${inlineStyle({...warningTextStyle, "max-width": "264px"})}">${warningText}</p>
    </div>
    `
}
export function renderDefault(time, gameStatusText, players, eliminated) {
    return `
    <div style="${inlineStyle({...rowStyle, display: "flex"})}">
        <div style="${inlineStyle(boxAndLabelStyle)}">
            <p style="${inlineStyle(labelStyle)}">ANNOUNCEMENTS</p>
            <div style="${inlineStyle({...boxStyle, ...statusStyle})}"> 
                <p style="${inlineStyle(entryStyle)}">${gameStatusText}</p>
            </div>
        </div>
        <div style="${inlineStyle(screenContainerStyle)}">
            <img src="https://d19un6ckffnywj.cloudfront.net/beaver-head-blkbg.gif" style="${inlineStyle(logoStyle)}" />
            <div style="${inlineStyle(screenGradientStyle)}"></div>
            <div style="${inlineStyle(upperGlareStyle)}"></div>
            <div style="${inlineStyle(lowerGlareStyle)}"></div>
        </div>
    </div>
    <div style="${inlineStyle(rowStyle)}">
        <div style="${inlineStyle(boxAndLabelStyle)}">
            <p style="${inlineStyle(labelStyle)}">ACTIVE</p>
            <div style="${inlineStyle({...boxStyle, ...activeUnitsStyle})}"> 
                ${players.map(p => {
                    return `
                    <p style="${inlineStyle(entryStyle)}">${p.display_name}</p>
                    `
                }).join("\n")}
            </div>
        </div>
        <div style="${inlineStyle(boxAndLabelStyle)}">
            <p style="${inlineStyle(labelStyle)}">ELIMINATED</p>
            <div style="${inlineStyle({...boxStyle, ...eliminatedStyle})}"> 
                ${eliminated.map(e => {
                    if (e.player.role === "Bugged") {
                        return `
                        <p style="${inlineStyle({...entryStyle, ...colorOrange})}">${e.player.display_name}</p>
                        `
                    } else {
                        return `
                        <p style="${inlineStyle(entryStyle)}">${e.player.display_name}</p>
                        `
                    }
                }).join("\n")}
            </div>
        </div>
    </div>
    `
}



export default async function update(params) {
    let buttons = [];
    let submit;

    const { selected, player, world } = params; 
    console.log(world);
    // console.log(params);
    const { mobileUnit } = selected || {};
    //console.log("building id: ", selected.mapElement.id);
    //console.log("selected coords: ", selected.tiles[0].coords);
    // console.log(player);

    const buildingId = selected.mapElement.id;
    let bags = findBags(world, mobileUnit);
    const has_tonk = bags[0].slots.findIndex(b => b.item && b.item.name.value == 'Tonk') >= 0 || bags[1].slots.findIndex(b => b.item && b.item.name.value == 'Tonk') >= 0
    const craft = () => {
        if (!mobileUnit) {
            ds.log('no selected engineer');
            return;
        }
        if (!buildingId) {
            ds.log('no selected building');
            return;
        }

        ds.dispatch(
            {
                name: 'BUILDING_USE',
                args: [buildingId, mobileUnit.id, []]
            },
        );

        ds.log('Tonk!');
    };

    if (!has_tonk) {
        buttons.push({ text: 'Craft Tonk', type: 'action', action: craft, disabled: false })
    }

    game = await getGame();
    players = await getPlayers(game.id, player.id);
    tonkPlayer = await getPlayer(player.id);

    if (wants_to_join) {
        try {
            await requestJoin(game.id, player.id)
            wants_to_join = false;
        } catch (e) {
            console.log(e)
        }
    }

    if (wants_to_start) {
        try {
            await requestStart()
            wants_to_start = false;
        } catch (e) {
            console.log(e)
        }
    }
    const joinGame = () => {
        wants_to_join = true;
    }

    const startGame = () => {
        wants_to_start = true;
    }

    if (cast_vote) {
        await sendVote(saved_vote_id, player);
        cast_vote = false;
        saved_vote_id = null;
    }

    const player_is_in_game = players ? players.findIndex(p => p.id == player.id) >= 0 : [];
    if (game.status == "Lobby") {
        if (!player_is_in_game && !!has_tonk && game.status == "Lobby") {
            buttons.push({ text: 'Join Game', type: 'action', action: joinGame, disabled: !has_tonk });
        }
        if (players.length >= MIN_NUMBER_PLAYERS && player_is_in_game) {
            buttons.push({ text: 'Start Game', type: 'action', action: startGame, disabled: !has_tonk || !player_is_in_game });
        }
    } 

    const onCastVote = (values) => {
        cast_vote = true;
        saved_vote_id = values.vote;
    };

    // if (game.status == "Tasks") {
    // }  
    if (game.status == "Vote") {
        submit = onCastVote;
    }  
    // if (game.status == "VoteResult") {
    // } 

    const warningText = getWarningText(game, players, has_tonk);
    let time = game.status == "Vote" ? "N/A" : game.time.timer;
    let showVote = game.status === "Vote" && !tonkPlayer.eliminated && tonkPlayer.used_action !== "Voted";

    return {
        version: 1,
        components: [
            {
                id: 'tonk-tower',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `
                        <div style="${inlineStyle(containerStyle)}">
                            ${renderDefault(time, gameStatusText(game), players, game.eliminated_players || [])}
                            ${showVote ? renderVote(players, tonkPlayer) : ""}
                            ${renderWarning(warningText)}
                        </div>
                        `,
                        buttons,
                        submit
                    },
                ],
            },
        ],
    };
}
