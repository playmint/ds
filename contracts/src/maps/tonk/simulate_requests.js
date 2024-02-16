const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const https = require('https');

// Constants
//const ENDPOINT = "https://ds-api.tonk.gg";
const ENDPOINT = "http://localhost:8082";
const PLAYER_IDS = [0,1,2,3,4,5,6,7,8,9].map((n) => 'staticplayerid' + n);
// const PLAYER_IDS = [0].map((n) => 'staticplayerid' + n);
const NUM_WORKERS = 10;

function httpRequest(url, options = { method: 'GET', body: null, headers: {} }) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseBody = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: responseBody });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Function to create a new worker thread with unique player ID
function createWorker(playerId) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, { workerData: { playerId } });

        worker.on('message', (msg) => {
            console.log('Main thread received message from worker:', msg);
        });

        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            } else {
                resolve();
            }
        });
    });
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
        // let response = await httpRequest(`${ENDPOINT}/player/${id}?secret_key=${secret}&onchain_hash=${hash}`, requestOptions)
        let response = await httpRequest(`${ENDPOINT}/player/${id}`, requestOptions)
        // let text = await response.text();
      } catch (e) {
        console.log(e);
      }
}

async function main() {
    try {
        // Here, instead of registering a single player, you might want to register each player with a unique ID.
        // If registering is a common action for all players regardless of their IDs, you might want to loop over the PLAYER_IDS array and register each one.
        PLAYER_IDS.forEach((playerId, i) => {
            registerPlayer(playerId, i, playerId, 'someHash', 'someSecret');
        })

        // Spawn worker threads with unique player IDs
        const workers = PLAYER_IDS.map(playerId => createWorker(playerId));
        
        // Wait for all workers to be done
        await Promise.all(workers);
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

async function getTask(playerId) {
    try {
        let response = await httpRequest(`${ENDPOINT}/task?player_id=${playerId}&secret_key=fff`);
        // let text = await response.text();
        // return JSON.parse(text);
    } catch (e) {
        console.log(e);
    }
}


async function getGame() {
    try {
        let response = await httpRequest(`${ENDPOINT}/game`);
        // let raw = await response.text();
        return JSON.parse(response.body);
    } catch (e) {
        console.log(e);
        return (`{ "status": "GameServerDown" }`)
    }
}

async function getPlayer(id) {
    try {
        let response = await httpRequest(`${ENDPOINT}/player/${id}`)
        // let raw = await response.text();
        // return JSON.parse(raw);
    } catch (e) {
        console.log(e);
    }
}

// If we're in the main thread, start the main function
if (isMainThread) {
    main();
} else {
    // This is the worker thread part. It will be executed in separate threads
    const tick = async () => {
        try {
            // Execute the tasks every 2 seconds
            const player = await getPlayer(workerData.playerId); // using the unique player ID passed to the worker
            const game = await getGame();
            if (game.status = "Tasks") {
                const task = await getTask(workerData.playerId);
            }

            // Send some data to the main thread if needed
            // parentPort.postMessage({ player, game, task });
        } catch (e) {
            console.error('Error in worker thread:', e);
        }

        // Schedule the next tick
        setTimeout(tick, 2000);
    };

    // Start the tick function
    tick();
}
