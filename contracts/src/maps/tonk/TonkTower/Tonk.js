import ds from 'downstream';

var game, tonkPlayer, tonkTask, lastRoundResult;
let bugging = false;
let player_to_bug = null;
let complete_task = false;
let perform_function = false;
let first_click_in = true;
let confirmed = false;

 let ENDPOINT = "http://localhost:8082"
//let ENDPOINT = "https://ds-api.tonk.gg"

async function getGame() {
    try {
        let response = await fetch(`${ENDPOINT}/game`);
        let raw = await response.text();
        return JSON.parse(raw);
    } catch (e) {
        console.log(e);
        return (`{ "status": "GameServerDown" }`)
    }
}

async function getPlayer(id) {
    try {
        let response = await fetch(`${ENDPOINT}/player/${id}`)
        let raw = await response.text();
        //console.log("Player JSON: " + raw);
        return JSON.parse(raw);
    } catch (e) {
        console.log(e);
    }
}

function isInGame(players, playerId) {
    return players.findIndex((p) => p.id == playerId) !== -1;
}

async function getPlayers(gameId, playerId) {
    try {
        let response = await fetch(`${ENDPOINT}/game/${gameId}/player?player_id=${playerId}`);
        let raw = await response.text();
        return JSON.parse(raw);
    } catch (e) {
        console.error(e);
        return [];
    }
}

async function getResult() {
    try {
        let response = await fetch(`${ENDPOINT}/game/result`)
        let text = await response.text();
        return JSON.parse(text);
    } catch (e) {
        console.log(e);
    }
}

async function getLastRoundResult(game) {
    //TODO implement 
    console.log("tonk getLastRound", game.time.round-1)
    try {
        let lastRound = game.time.round - 1;
        let response = await fetch(`${ENDPOINT}/game/result/${lastRound}`)
        let text = await response.text();
        return JSON.parse(text);
    } catch (e) {
        console.log(e);
}
}

async function registerPlayer(id, mobileUnitId, displayName, hash, secret) {
    var raw = JSON.stringify({
        id: id, 
        mobile_unit_id: mobileUnitId,
        display_name: displayName 
    })
    var requestOptions = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: raw
      };
      
      try {
        // let response = await fetch(`${ENDPOINT}/player/${id}?secret_key=${secret}&onchain_hash=${hash}`, requestOptions)
        let response = await fetch(`${ENDPOINT}/player/${id}`, requestOptions)
        // let text = await response.text();
      } catch (e) {
        console.log(e);
      }
}

async function getTask(player) {
    try {
        let response = await fetch(`${ENDPOINT}/task?player_id=${player.id}&secret_key=fff`);
        let text = await response.text();
        return JSON.parse(text);
    } catch (e) {
        console.log(e);
    }
}

async function postTask(task, player) {
    var raw = JSON.stringify(task);
    var requestOptions = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: raw
      };
      
      try {
        let response = await fetch(`${ENDPOINT}/task?player_id=${player.id}&secret_key=fff`, requestOptions)
      } catch (e) {
        console.log(e);
      }
}

async function postAction(target, game, player, confirmed) {
    var raw = JSON.stringify({
        poison_target: target,
        round: game.time.round,
        confirmed,
        interrupted_task: false 
    })
    var requestOptions = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: raw
      };
      
      try {
        let response = await fetch(`${ENDPOINT}/action?player_id=${player.id}&secret_key=fff`, requestOptions)
      } catch (e) {
        console.log(e);
      }
}

function reasonToPlaintext(p) {
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

function buildingIdToDirections(readableId) {
    switch(readableId) {
        case "HEX_DUMP": {
            return { at: "North", with: "with the gears and pipes"};
        }
        case "SELFIE_POINT": {
            return {at: "West", with: "with the umbrella on top"};
        }
        case "MEME_GEN": {
            return {at: "East", with: "with the steamed ham ontop"};
        }
        default: {
            return "";
        }
    }
}

function getInformativeText(status, tonkPlayer) {
    switch(status) {
        case "SPECTATOR": {
            return "You are a spectator. You may join when game is in the lobby."
        }
        case "ELIMINATED": {
            return "You have been eliminated. Please wait and then return to the center." 
        }
        case "Lobby": {
            return "You will receive instructions when the game begins.";
        }
        case "Tasks": {
            if (tonkPlayer.role === "Bugged") {
                let isNearTower = tonkPlayer.proximity && tonkPlayer.proximity.nearby_buildings && tonkPlayer.proximity.nearby_buildings.filter(b => b.is_tower).length > 0
                let isNearPlayer = tonkPlayer.proximity && tonkPlayer.proximity.nearby_players && tonkPlayer.proximity.nearby_players.length > 0
                if (isNearTower) {
                    return "You cannot tonk players within 3 tiles of the compute center"
                }

                if (!isNearPlayer) {
                    return "You must be within 2 tiles of a player to tonk them. Look for the button to appear below."
                }
            } else {
                if (tonkTask.complete) {
                    return "You have performed your duty. Waiting for next instructions..."
                } else {
                    return "Follow the directions. When you are next to the building a button will appear below."
                }
            }
            return ""
        }
        case "Vote": {
            return "Make your way to the compute center to vote out the Brainwashed units!"
        }
        case "VoteResult": {
            return "Waiting for next instructions..."
        }
        case "End": {
            return "The game is over. Return to the compute center to create a new lobby."
        }
        default: {
            return ""
        }
    }
}

function gameStatusText(game) {
    const { status, win_result } = game;
    switch(status) {
        case "SPECTATOR": {
            return "You are not in the game";
        }
        case "ELIMINATED" :{
            return "You have been eliminated"
        }
        case "Lobby": {
            return "Game has an open lobby";
        }
        case "Tasks": {
            return "Units are doing their tasks";
        }
        case "Vote": {
            return "Voting is in session";
        }
        case "VoteResult": {
            return "All votes are in and counted";
        }
        case "End": {
            if (win_result === "Thuggery") {
                return "Brainwashed win"
            } else {
                return "Sentient win"
            }
        }
        default: {
            return ""
        }
    }
}

function getRoleText(role, has_joined) {
    switch(role) {
        case "Bugged": {
            return "Brainwashed Unit"
        }
        case "Normal": {
            return "Sentient Unit"
        }
        default: {
            if (has_joined) {
                return "████████ Unit"
            } else {
                return "Spectator Unit"
            }
        }
    }
}

function getEliminationReason(e) {
    switch(e.reason) {
        case "BuggedOut": {
            return "was tonked."
        }
        case "VotedOut": {
            return "was voted out."
        }
        case "Inaction": {
            return "failed to act."
        }
        default: {
            return "no news to report."
        }
    }
}

function getTaskDepotText(player) {
    if (typeof tonkTask === 'undefined') {
        return "ERROR"
    }
    // this is the text displayed to the Brainwashed
    if (tonkTask.destination.id === "") {
        if (player.used_action === "ReturnToTower") {
            return "COMPUTE CENTER"
        } else if (player.used_action === "TaskComplete") {
            return "GOOD JOB UNIT"
        } else {
            return "TONK A UNIT"
        }
    }
    if (!tonkTask.dropped_off) {
        return tonkTask.destination.readable_id;
    }
    if (!tonkTask.dropped_off_second) {
        return tonkTask.second_destination.readable_id;
    }
    if (!tonkTask.complete) {
        return "COMPUTE CENTER"
    }
    if (tonkTask.complete) {
        return "GOOD JOB UNIT"
    }

    return "";
}

function formatHtml(status, game, player, players, task, lastRoundResult) {
    let the_other_bugs = []; 
    if (players.length > 0 && typeof players[0].role !== 'undefined') {
        players.map((p) => {
            if (p.role == "Bugged" && p.id !== player.id) {
                the_other_bugs.push(p);
            }
        })
    }
    let the_other_bugs_html = the_other_bugs.length > 0 ? `<p style="font-weight: bold"> Pssst, the other evil units are: 
        ${the_other_bugs.map((bugs,i) => {
            if (i == 0) {
                return bugs.display_name;
            } else {
                return ", " + bugs.display_name;
            }
        })}</p>` : "";

    if (status == "SPECTATOR") {
        return `
            <p> Please go to the Tonk Tower to join the game </p>
        `
    } else if (status == "ELIMINATED") {
        return `
            <p> You have been eliminated! You can watch the game progress at the Tonk Tower </p>
        `;
    } else if (status == "Lobby") {
        return `
            <h3>Lobby</h3>
            <p> Waiting for the game to start... </p>
        `
    } else if (status == "Tasks") {
        if (player.role && player.role == "Bugged") {
            return `
                <h3> Complete the Task </h3>
                <h3>Time remaining: ${game.time.timer}</h3>
                <br/>
                ${the_other_bugs_html}
                </br>
                ${player.used_action == "TaskComplete" ? (
                    `<p> Ok, great work you evil unit you. Now, try to act normal!`
                ) : player.used_action == "ReturnToTower" ? (
                    `<p> You did the attack. Now you must return to the tower to confirm the dastardly deed.`
                ) : (
                    `<p> <span style="font-weight: bold">Objective:</span> ${task.destination.task_message} </p></br>${
                        player.proximity.immune ? (
                            "<p> Your attack power is useless within 3 tiles of the Tower </p> "
                        ) : (
                            player.proximity.nearby_players && player.proximity.nearby_players.length == 0 ? (
                                `<p> There are no nearby players to attack. You must be within 2 tiles to attack someone. </p>`
                            ) : ""
                        )
                    }`
                )}
            `
        } else {
            let directions = buildingIdToDirections(task.destination.readable_id);
            let second_directions = buildingIdToDirections(task.second_destination.readable_id);
            return `
                <h3> Complete the Task </h3>
                <h3>Time remaining: ${game.time.timer}</h3>
                <br/>
                ${task.complete ? (
                    `<p> Objective Complete! Take a well-deserved rest until the next round </p>`
                ) : task.dropped_off_second ? (
                    `<p> <span style="font-weight: bold">Objective:</span> Return to the Tower to complete the task! </p>`
                ) : task.dropped_off ? (
                    `<p style="font-weight: bold"> Now go to the second destination: </p>
                    <p> At the building ${second_directions.at} of the tower, ${second_directions.with}! </p>
                    <p> <span style="font-weight: bold">Objective:</span> ${task.second_destination.task_message} </p>`
                ) : (
                    `
                    <p style="font-weight: bold"> Go to your first destination: </p>
                    <p> At the building ${directions.at} of the tower, ${directions.with}! </p>
                    <p> <span style="font-weight: bold">Objective:</span> ${task.destination.task_message} </p>`
                )}
                <br/>
                <p> [Failure will result in your deletion. Thank you for your cooperation.] </p>
            `
        }
    } else if (status == "TaskResult") {
        return `
            <h3> Tasks complete </h3>
            <h3>Time remaining: ${game.time.timer}</h3>
            ${player.role && player.role == "Bugged" ? `${the_other_bugs_html}</br>` : ""}
            <br/>
            <p> Return back to the tower to see results! </p>
        `;
    } else if (status == "Vote") {
        return `
            <h3> Vote </h3>
            <h3>Time remaining: ${game.time.timer}</h3>
            <br/>
            ${player.role && player.role == "Bugged" ? `${the_other_bugs_html}</br>` : ""}
            <p> Go to the tower and submit your vote! </p> <br/>
            <p style="font-weight: bold"> Results of the last task round: </p>
            ${lastRoundResult.eliminated && lastRoundResult.eliminated.length > 0 ? "<p> Player deletion report: </p><br/>" : "<p>Somehow, you all have avoided deletion.</p>"}
            ${lastRoundResult.eliminated && lastRoundResult.eliminated.length > 0 ? lastRoundResult.eliminated.map((p) => `<p>${p.player.display_name} ${reasonToPlaintext(p)}</p>`) : ""}
            <br/>
            <p> [Indecision will result in your deletion. Thank you for your cooperation.] </p>
        `;
    } else if (status == "VoteResult") {
        return `
            <h3> Votes counted </h3>
            <h3>Time remaining: ${game.time.timer}</h3>
            ${player.role && player.role == "Bugged" ? `${the_other_bugs_html}</br>` : ""}
            <br/>
            <p style="font-weight: bold"> The tower is announcing the result </p>
        `;
    } else if (status == "End") {
        return `
            <h3> Game Over </h3>
            <h3>Time until next game lobby: ${game.time.timer}</h3>
            <br/>
            <p> Victory! Return to the tower to play again </p>
        `;
    }
}

function inlineStyle(style) {
    return Object.keys(style).map(key => {
        return `${key}:${style[key]}`
    }).join(';');
} 

function showNotification(proximity) {
    let nearbyPlayers = proximity ? proximity.nearby_players : [];
    let container = {
        position: 'fixed',
        display: 'inline-block',
        bottom: '3.6rem',
        right: '2.4rem',
        "min-height": '4rem',
        "max-height": '20rem',
        padding: '1.2rem',
        "background-color": 'white',
        transition: 'bottom 1s ease-in, opacity 0.6s ease-in',
        "border-radius": "1.2rem",
        border: "#0D090F 3px solid"
    };
    return `
        <div style="${inlineStyle(container)}">
            ${nearbyPlayers ? nearbyPlayers.length == 0 ? (
                "No one is nearby"
            ) : (
                nearbyPlayers.map((n) =>`<p>${n.display_name}</p>`).join('\n')
            ) : "No one is nearby"}
        <div>
    `
}

const containerStyle = {
    width: "100%",
}

const screenContainerStyle = {
    width: "255px",
    "max-width": "255px",
    height: "118px",
    "max-height": "118px",
    "border-radius": "12px",
    overflow: "hidden",
    background: "black",
    position: "absolute",
    "margin-left": "1px"
}

const miniScreenContainerStyle = {
    width: "253px",
    "max-width": "253px",
    height: "53px",
    "margin-left": "1px",
    "max-height": "53px",
    "border-radius": "5px",
    overflow: "hidden",
    background: "black",
    position: "absolute",
  }

const screenGradientStyle = {
    width: "253px",
    "max-width": "253px",
    height: "118px",
    "max-height": "118px",
    position: "absolute",
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.50) 5.22%, rgba(255, 255, 255, 0.38) 14.06%, rgba(255, 255, 255, 0.00) 100%)"
}

const lowerGlareStyle = {
    position: "absolute",
    top: "81px",
    transform: "rotate(180deg)",
    width: "253px",
    "max-width": "253px",
    height: "34px",
    "max-height": "34px",
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.30) 5.22%, rgba(255, 255, 255, 0.23) 21.88%, rgba(255, 255, 255, 0.00) 100%)",
    filter: "blur(7px)",
}
const upperGlareStyle = {
    width: "253px",
    "max-width": "253px",
    height: "34px",
    "max-height": "34px",
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.30) 5.22%, rgba(255, 255, 255, 0.23) 21.88%, rgba(255, 255, 255, 0.00) 100%)",
    filter: "blur(7px)",
}

const miniUpperGlareStyle = {
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.50) 5.22%, rgba(255, 255, 255, 0.23) 21.88%, rgba(255, 255, 255, 0.00) 100%)"
}

const logoStyle = {
    width: "253px",
    position: "absolute",
    top: "2px",
    left: "0px",
}

const screenRow = {
    display: "block",
    width: "100%",
    height: "123px",
    position: "absolute",
    top: 0,
    left: 0
}

const miniGradient = {
    height: "53px",
    "max-height": "53px",
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.25) 5.22%, rgba(255, 255, 255, 0.18) 14.06%, rgba(255, 255, 255, 0.00) 100%)"
}

const miniGlare = {
    height: "17px",
    "max-height": "17px",
}

const bigTextStyle ={
    "font-family": "Recursive, monospace",
    "font-size": "25px",
    "font-style": "normal",
    "font-weight": 500,
}

const roleTextStyle = {
    color: "#E47740",
    "text-shadow": "-2px -2px 3px rgba(228, 119, 66, 0.50), 2px 2px 2px rgba(228, 119, 63, 0.50)",
    "line-height": "34px",
    height: "53px",
    top: 0,
    position: "absolute",
    "text-align": "center",
    padding: "10px",
    width: "100%"
}

const rowStyle = {
    display: "block",
    width: "100%",
    height: "120px",
    "margin-top": "12px"
}
// button-styles__TextButton-sc-7fe74a04-0 button-styles__ActionButton-sc-7fe74a04-1 kEuMYh jQZoSm
// sc-7fe74a04-0 sc-7fe74a04-1 gpXETn jzrUbI
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

const timeBoxStyle = {
    display: "inline-block",
    "border-radius": "5px",
    background: "#EDEBF6",
    border: "3px solid black",
}

const statusStyle = {
    "min-width": "215px",
    "max-width": "215px",
    "min-height": "75px",
    "max-height": "75px",
}

const directionsStyle = {
    "min-width": "215px",
    "max-width": "215px",
    "min-height": "53px",
    "max-height": "53px",
}

const timeStyle = {
    "min-width": "94px",
    "max-width": "94px",
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

const warningTextStyle = {
    color: "#A19BAD",
    "font-family": "Recursive, monospace",
    "font-size": "18px",
    "font-weight": "500",
    "text-align": "center"
}

let nearbyPlayersContainer = {
    position: 'fixed',
    display: 'inline-block',
    bottom: '3.6rem',
    right: '2.4rem',
    "min-height": '4rem',
    padding: '1.2rem',
    "background-color": 'white',
    transition: 'bottom 1s ease-in, opacity 0.6s ease-in',
    "border-radius": "1.2rem",
    border: "#0D090F 3px solid",
    "max-width": "350px"
};

let playerFlexBox = {
    display: 'flex',
    position: 'relative',
    "max-width": "100%",
    "flex-direction": "row",
    "flex-wrap": "wrap",
    "max-height": "265px",
}

const colorOrange = {
    color: "#FB7001",
}
const colorPurple = {
    color: "#9C74FD"
}
const colorGreen = {
    color: "#32B25A"
}
const colorPink = {
    color: "#E76CC9"
}
const colorBlue = {
    color: "#2DAEE0"
}

const blackBackgroundStyle = {
    display: "block",
    width: "260px",
    height: "200px",
    position: "absolute",
    background: "black",
    "border-radius": "14px",
    top: "-2px",
    left: "-3px",
    "z-index": "-1",
}

function renderNearbyPlayers(tonkPlayer) {
    let nearbyPlayers = tonkPlayer.proximity ? (
        tonkPlayer.proximity.nearby_players || []
    ) : []
    return `
        <div style="${inlineStyle(nearbyPlayersContainer)}">
            <p style="${inlineStyle({...labelStyle, "max-width": "100%"})}">Nearby Units</p>
            <p style="${inlineStyle({...warningTextStyle, width: "100%", "text-align": "left"})}">Units within this range are a danger to you.</p>
            <div style="${inlineStyle(playerFlexBox)}">
                ${nearbyPlayers.map(p => {
                    return `
                        <p style="${inlineStyle(entryStyle)}">${p.display_name}</p>
                    `
                }).join("\n")}
            </div>
        </div>
    `
}

function renderInformation(informativeText) {
    return `
    <div style="${inlineStyle({...rowStyle, height: "175px", margin: "0px 0 25px 0", display: "flex", "align-items": "center", "justify-content": "center", "max-height": "220px"})}">
        <p style="${inlineStyle({...warningTextStyle, "max-width": "264px"})}">${informativeText}</p>
    </div>
    `
}

function renderRoundView(status, player) {
    let depotText = getTaskDepotText(player); 
    switch(status) {
        case "SPECTATOR": {
            return ""
        }
        case "ELIMINATED": {
            return renderLastRoundInformation();
        }
        case "Lobby": {
            return "";
        }
        case "Tasks": {
            return renderDirections(depotText);
        }
        case "Vote": {
            return renderLastRoundInformation();
        }
        case "VoteResult": {
            return renderLastRoundInformation();
        }
        case "End": {
            return renderLastRoundInformation();
        }
        default: {
            return ""
        }
    }
}

function renderLastRoundInformation() {
    if (!lastRoundResult.eliminated || lastRoundResult.eliminated.length == 0) {
        lastRoundResult.eliminated = [{
            player: {
                display_name: "N/A"
            }
        }]
    }
    return `
<div style="${inlineStyle(rowStyle)}">
    <div style="${inlineStyle(boxAndLabelStyle)}">
        <p style="${inlineStyle({...labelStyle, width: "100%"})}">LAST ROUND SUMMARY</p>
        <div style="${inlineStyle({...boxStyle, ...statusStyle, "overflow-y": "scroll"})}"> 
            ${lastRoundResult.eliminated.map(e => {
                if (e.player.role === "Bugged") {
                    return `
                        <p style="${inlineStyle({...entryStyle, ...colorOrange})}">${e.player.display_name} — ${getEliminationReason(e)}</p>
                    `
                } else {
                    return `
                        <p style="${inlineStyle(entryStyle)}">${e.player.display_name} — ${getEliminationReason(e)}</p>
                    `
                }
            }).join("\n")}
        </div>
    </div>
</div>
    `
}

function getColorForDestination(destination) {
    switch(destination) {
        case "DATA DUMP NORTH": {
            return colorGreen.color;
        }
        case "DATA DUMP WEST": {
            return colorPurple.color;
        }
        case "DATA DUMP EAST": {
            return colorPink.color;
        }
        case "COMPUTE CENTER": {
            return colorBlue.color;
        }
        default: {
            return colorOrange.color;
        }
    }
}

function getColorForBug() {
    if (tonkPlayer.used_action === "ReturnToTower") {
        return colorBlue.color;
    } else if (tonkPlayer.used_action === "TaskComplete") {
        return colorOrange.color; 
    } else {
        return "#F00";
    }
}

function renderDirections(depotText) {
    let color = getColorForDestination(depotText);
    const colorStyle = tonkTask.destination.id === "" ? { background: getColorForBug() } : { background: color };
    return `
    <div style="${inlineStyle(rowStyle)}">
        <div style="${inlineStyle(boxAndLabelStyle)}">
            <p style="${inlineStyle(labelStyle)}">DIRECTIONS</p>
            <div style="${inlineStyle({...boxStyle, ...directionsStyle, ...colorStyle})}"> 
                <p style="${inlineStyle({...bigTextStyle, "font-size": "22px", "text-align": "center", "line-height": "50px"})}">${depotText}</p>
            </div>
        </div>
    </div>
    `
}

function renderDefault(time, gameStatusText, roleText) {
    return `
<div style="${inlineStyle({...blackBackgroundStyle, transform: "translateY(-175px)"})}">
</div>
<div style="${inlineStyle({...screenRow, transform: "translateY(-174px)"})}">
    <div style="${inlineStyle(screenContainerStyle)}">
        <div style="${inlineStyle(screenGradientStyle)}"></div>
        <div style="${inlineStyle(upperGlareStyle)}"></div>
        <div style="${inlineStyle(lowerGlareStyle)}"></div>
        <img src="https://d19un6ckffnywj.cloudfront.net/tonk-attack-transparent-logo.gif" style="${inlineStyle(logoStyle)}" />
    </div>
</div>
<div style="${inlineStyle({...screenRow, transform: "translateY(-55px)", height: "53px"})}">
    <div style="${inlineStyle(miniScreenContainerStyle)}">
        <div style="${inlineStyle({...screenGradientStyle, ...miniGradient})}"></div>
        <div style="${inlineStyle({...upperGlareStyle, ...miniGlare, ...miniUpperGlareStyle })}"></div>
        <div style="${inlineStyle({...lowerGlareStyle, ...miniGlare, top: "36px" })}"></div>
        <p style="${inlineStyle({...bigTextStyle, ...roleTextStyle})}">${roleText}</p>
    </div>
</div>
<div style="${inlineStyle({...screenRow, transform: "translate(255px, 24px)", height: "106px", width: "auto"})}">
    <div style="${inlineStyle({...boxAndLabelStyle, transform: "translateY(0)"})}">
        <p style="${inlineStyle({...labelStyle, ...timeBoxStyle, display: "block", margin: "0 0 -3px 0", "text-align": "center"})}">TIME</p>
        <div style="${inlineStyle({...timeBoxStyle, ...timeStyle, margin: "0"})}"> 
            <p style="${inlineStyle(timeTextStyle)}">${time}</p>
        </div>
    </div>
</div>
<div style="${inlineStyle(rowStyle)}">
    <div style="${inlineStyle(boxAndLabelStyle)}">
        <p style="${inlineStyle(labelStyle)}">GAME STATUS</p>
        <div style="${inlineStyle({...boxStyle, ...statusStyle})}"> 
            <p style="${inlineStyle(entryStyle)}">${gameStatusText}</p>
        </div>
    </div>
</div>
    `
}
export default async function update(params) {
    const { selected, player, state } = params;
    const { mobileUnit } = selected || {};
    let playerEliminated = false;

    // if(!player){
    //     console.log(" NO PLAYER");
    //     return;
    // }
    // else
    // {
    //     console.log("PLAYER FOUND");
    // }

    game = await getGame();
    tonkPlayer = await getPlayer(player.id);

    // REGISTER FOR NAME UPDATES OR IF FIRST TIME CONNECTING
    let nameField = mobileUnit.name || { value: `UNIT ${mobileUnit.key.replace("0x", "").toUpperCase()}`}
    if (!tonkPlayer || tonkPlayer.id == "" || first_click_in) {
        await registerPlayer(player.id, mobileUnit.id, nameField.value);
        first_click_in = false;
    } else if (tonkPlayer.display_name != nameField.value) {
        await registerPlayer(player.id, mobileUnit.id, nameField.value);
    }

    let players = await getPlayers(game.id, player.id);
    let has_joined = isInGame(players, player.id);
    let status = has_joined ? game.status : "SPECTATOR";

    status = tonkPlayer.eliminated || playerEliminated ? "ELIMINATED" : status;

    let buttons = []
    const bugOut = (id, displayName) => {
        bugging = true;
        player_to_bug = {
            id,
            display_name: displayName,
        }
    }

    const confirmBug = () => {
        bugging = true;
        confirmed = true;
        player_to_bug = {
            id: tonkPlayer.id,
            display_name: "fake"
        };
    }

    const completeTask = () => {
        complete_task = true;
    }

    const performFunction = () => {
        perform_function = true;
    }

    if (bugging) {
        await postAction(player_to_bug, game, tonkPlayer, confirmed);
        bugging = false;
        player_to_bug = null;
        confirmed = false;
    }

    if (game.status === "Tasks") {
        tonkTask = await getTask(tonkPlayer);
        buttons = [];
        if (tonkPlayer.role == "Bugged") {
            if (tonkPlayer.proximity.nearby_players && tonkPlayer.proximity.nearby_players.length != 0 && tonkPlayer.used_action == "Unused") {
                tonkPlayer.proximity.nearby_players.forEach((p) => {
                    if (!p.proximity.immune && p.role !== "Bugged") {
                        buttons.push(
                            { text: `Tonk ${p.display_name}`, type: 'action', action: bugOut.bind(this, p.id, p.display_name), disabled: false }
                        )
                    }
                });
            }
            let isNearTower = tonkPlayer.proximity && tonkPlayer.proximity.nearby_buildings && tonkPlayer.proximity.nearby_buildings.filter(b => b.is_tower).length > 0
            if (tonkPlayer.used_action == "ReturnToTower" && isNearTower) {
                buttons = [
                    {
                        text: `Upload Kill`,
                        type: 'action',
                        action: confirmBug.bind(this), 
                        disabled: false
                }];
            }
        } else {
            if (complete_task) {
                await postTask(tonkTask, tonkPlayer);
                complete_task = false;
            }
            if (perform_function) {
                await postTask(tonkTask, tonkPlayer);
                perform_function = false;
            }
            if (tonkPlayer.proximity.nearby_buildings && tonkPlayer.proximity.nearby_buildings.findIndex((b) => b.id == tonkTask.destination.id) >= 0 && !tonkTask.dropped_off) {
                buttons = [
                    { text: 'Download Data', type: 'action', action: performFunction, disabled: perform_function }
                ];
            }
            if (tonkPlayer.proximity.nearby_buildings && tonkPlayer.proximity.nearby_buildings.findIndex((b) => b.id == tonkTask.second_destination.id) >= 0 && !tonkTask.dropped_off_second && tonkTask.dropped_off) {
                buttons = [
                    { text: 'Download Data', type: 'action', action: performFunction, disabled: perform_function }
                ];
            }
            if (tonkPlayer.proximity.nearby_buildings && tonkPlayer.proximity.nearby_buildings.findIndex((b) => b.is_tower) >= 0 && !tonkTask.complete && tonkTask.dropped_off && tonkTask.dropped_off_second) {
                buttons = [
                    { text: 'Upload Data', type: 'action', action: completeTask, disabled: complete_task }
                ];
            }
        }
    }

    if (game.status === "VoteResult") {
        let result = await getResult();
        lastRoundResult = result;
        playerEliminated = result.eliminated && result.eliminated.findIndex(p => p.player.id == tonkPlayer.id) >= 0;
    }

    if (game.status === "Vote") {
        lastRoundResult = await getLastRoundResult(game);
    }

    if (game.status === "End") {
        lastRoundResult = await getResult();
    }

    return {
        version: 1,
        components: [
            {
                id: 'tonk',
                type: 'item',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `
                        <div style="${inlineStyle(containerStyle)}">
                            ${renderDefault(
                                game.time.timer, 
                                gameStatusText(game),
                                getRoleText(tonkPlayer.role, has_joined)
                            )}
                            ${renderRoundView(status, tonkPlayer)}
                            ${renderInformation(getInformativeText(status, tonkPlayer))}
                        </div>
                        ${renderNearbyPlayers(tonkPlayer)}
                        `,
                        buttons
                    },
                ],
            },
        ],
    };
}