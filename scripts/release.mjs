#!/usr/bin/env node

import _yargs from 'yargs';
import { select, input, confirm, password } from '@inquirer/prompts';
import { hideBin } from 'yargs/helpers';
import { Octokit, App } from "octokit";
import { execSync, exec } from 'child_process';
import semver from 'semver';
import YAML from 'yaml';
import fs from 'fs';
import https from 'https';

const GITHUB_OWNER = 'playmint';
const GITHUB_REPO = 'ds';
const DOCKER_REGISTERY = 'ghcr.io';
const CHAIN_ID = 14829;
const CHAIN_ENDPOINT_HTTP = 'https://playmint-testnet.calderachain.xyz/http';
const CHAIN_ENDPOINT_WS = 'wss://playmint-testnet.calderachain.xyz/ws';
const CLUSTER_DOMAIN = 'dev.playmint.com';

async function main({
    allowDirty,
    deployerPrivateKey,
    sequencerPrivateKey,
    dryRun,
    gameAddress,
    deploymentName,
}) {
    // abort if attempt to overrite ds-main or ds-exp
    if (deploymentName === 'main') {
        fatal(`do not use this script to deploy ${deploymentName}, that deployment is managed by Github Actions`);
    }

    const octokit = new Octokit({});
    let ok;
    console.log('\n');

    // get the current commit
    const longSHA = execSync(`git rev-parse HEAD`).toString().trim();
    const shortSHA = execSync(`git rev-parse HEAD`).toString().trim();

    // get the expected image names
    const images = {
        contracts: containerImage('ds-contracts', longSHA),
        services: containerImage('ds-services', longSHA),
        shell: containerImage('ds-shell', longSHA),
        docs: containerImage('ds-docs', longSHA),
    };

    // check not dirty
    if (!allowDirty) {
        check(`you have no uncommitted changes ${allowDirty ? '(BYPASSED!)' : ''}`, () => {
            return execSync(`git diff --stat`).toString() === '';
        });
    }

    // check that there are docker builds for this commit otherwise there
    // will be nothing to run!
    for (const image of Object.values(images)) {
        await check(`docker image ${image.split('/').slice(-1)}`, () => {
            execSync(`docker manifest inspect ${image}`);
        });
    };

    // check that a deployment suceeded so that we know that this build is
    // at least in a deployable condition
    if (!dryRun) {
        await check(`github action checks for ${shortSHA}`, async () => {
            const workflows = await octokit.request(`GET /repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?head_sha=${longSHA}`, {
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                headers: { 'X-GitHub-Api-Version': '2022-11-28' }
            });
            const ok = workflows.data.workflow_runs.some(run => {
                return run.conclusion === 'success' && /Deployment/.test(run.name)
            });
            if (!ok) {
                throw new Error('we need to see a successful deployment before release');
            }
            return true;
        });
    }

    // deploy the contracts
    if (!gameAddress) {
        if (!dryRun) {
            await check(`contracts deployment`, () => {
                execSync(`forge script script/Deploy.sol:GameDeployer --force --broadcast --rpc-url "${CHAIN_ENDPOINT_HTTP}"`, {
                    cwd: './contracts',
                    stdio: 'inherit',
                    env: {
                        ...process.env,
                        DEPLOYER_PRIVATE_KEY: deployerPrivateKey,
                    },
                });
            });
        }
        // read back latest game address
        const broadcast = JSON.parse(fs.readFileSync(`contracts/broadcast/Deploy.sol/${CHAIN_ID}/run-latest.json`).toString());
        const tx = broadcast.transactions.find(tx => tx.transactionType === 'CREATE' && tx.contractName === 'DownstreamGame');
        gameAddress = tx?.contractAddress;
    }

    // ensure we have a game address
    await check(`game address ${gameAddress}`, () => {
        return !!gameAddress;
    });

    // ensure we have a deployment name
    await check(`target deployment name ${deploymentName}`, () => {
        return !!deploymentName;
    });

    // deploy the helm chart
    const namespace = `ds-${deploymentName}`;
    await check(`services deployment`, () => {
        execSync(['helm', 'upgrade',
            '--timeout 15m',
            '--history-max 5',
            '--install',
            '--wait',
            '--debug',
            dryRun ? '--dry-run' : '',
            'ds',
            './chart',
            `--set cluster.domain=${CLUSTER_DOMAIN}`,
            `--set version=${longSHA}`,
            `--set priorityClassName=production`,
            `--set chainId=${CHAIN_ID}`,
            `--set anvil.enabled=false`,
            `--set sequencer.providerUrlHttp=${CHAIN_ENDPOINT_HTTP}`,
            `--set sequencer.providerUrlWs=${CHAIN_ENDPOINT_WS}`,
            `--set sequencer.privateKey=${sequencerPrivateKey}`,
            `--set sequencer.mineEmpty=false`,
            `--set indexer.providerUrlHttp=${CHAIN_ENDPOINT_HTTP}`,
            `--set indexer.providerUrlWs=${CHAIN_ENDPOINT_WS}`,
            `--set indexer.gameAddress=${gameAddress}`,
            `--set frontend.gameAddress=${gameAddress}`,
            '--create-namespace',
            `-n ${namespace}`,
        ].join(' '), {stdio: 'inherit'});
    });

    // wait til API is up and we can find all the addresses
    const servicesURL = `https://services-${namespace}.${CLUSTER_DOMAIN}`;
    const servicesWS = `wss://services-${namespace}.${CLUSTER_DOMAIN}`;
    let contracts
    while (!contracts) {
        console.log(`...waiting for ${servicesURL} to start serving data for: ${gameAddress}`);
        contracts = await getGameContracts(servicesURL, gameAddress);
        await sleep(3000);
    }
    await check(`router address ${contracts.router}`, () => !!contracts.router);
    await check(`dispatcher address ${contracts.dispatcher}`, () => !!contracts.dispatcher);
    await check(`state address ${contracts.state}`, () => !!contracts.state);

    // ds apply fixtures
    if (!dryRun) {
        await check(`apply fixtures`, () => {
            execSync([
                `ds`,
                `--ws-endpoint ${servicesWS}/query`,
                `--http-endpoint ${servicesURL}/query`,
                `-k ${deployerPrivateKey}`,
                `apply -R -f ./contracts/src/fixtures`
            ].join(' '), {
                stdio: 'inherit'
            })
        });
    }

    // ds disable-cheats
    // TODO: needs implementing in ds-cli
    // await check(`disable cheats`, () => {
    //     execSync(`ds -k ${deployerPrivateKey} dev disable-cheats`, {
    //         env: {
    //             ...process.env,
    //             PLAYER_PRIVATE_KEY: deployerPrivateKey, // TODO: make ds support this to avoid putting key in command
    //         },
    //     })
    // });

    // TODO: purge azure cache if a public domain set
    // az afd endpoint purge --profile-name "${{ inputs.AZURE_FRONT_DOOR_PROFILE }}" --domain "${{ inputs.AZURE_FRONT_DOOR_DOMAIN }}" --resource-group dev --endpoint-name "${{ inputs.AZURE_FRONT_DOOR_ENDPOINT }}" --content-paths '/*'

    // write the release notes
    const notes = `
+--------------------------------------------------------------
|
| urls
|
| game       : https://frontend-${namespace}.${CLUSTER_DOMAIN}
| services   : ${servicesURL}
| network    : ${CHAIN_ENDPOINT_HTTP}
|
| contracts
|
| game       : https://playmint-testnet.calderaexplorer.xyz/address/${gameAddress}
| router     : https://playmint-testnet.calderaexplorer.xyz/address/${contracts.router}
| dispatcher : https://playmint-testnet.calderaexplorer.xyz/address/${contracts.dispatcher}
| state      : https://playmint-testnet.calderaexplorer.xyz/address/${contracts.state}
|
+--------------------------------------------------------------
`;
    console.log(notes);
    console.log('\n');
    if (dryRun) {
        console.log('this was a dry-run, nothing actually changed');
    } else {
        console.log('🚀 DONE!')
    }
    process.exit(0);
}

async function getGameContracts(servicesURL, addr) {
    return fetch(`${servicesURL}/query`, {
        headers: {
            'accept': "application/json, multipart/mixed",
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            query: `{
                game(id: "${addr}") {
                    id
                    router {id }
                    dispatcher { id }
                    state {
                        id
                        items: nodes(match:{kinds:"Item"}) {id}
                    }
                }
            }`,
        }),
        method: "POST"
    })
        .then(res => res.json())
        .then(o => {
            if (o.error) {
                console.log(o);
            }
            if (!o.data || !o.data.game) {
                throw new Error('game not found yet');
            }
            const items = o.data.game?.state?.items;
            if (!items || items.length === 0) {
                throw new Error('items not found yet'); // TODO: maybe redundent after extraction
            }
            return o.data.game;
        })
        .then((game) => game?.id ? ({
            game: game?.id,
            router: game?.router?.id,
            dispatcher: game?.dispatcher.id,
            state: game?.state.id
        }) : null)
        .catch(() => (null));
}


function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function check(msg, fn) {
    console.log(`+---------------------`)
    console.log(`| 👀 ${msg}`);
    console.log(`+---------------------`)
    console.log('');
    try {
        const ok = await Promise.resolve(fn());
        if (ok === false) {
            throw new Error('not ok');
        }
    } catch (err) {
        console.log(`+---------------------`)
        console.log(`| ❌ ${msg}`);
        console.log(`+---------------------`)
        console.log('');
        fatal(err.message);
        return false;
    }
    console.log(`+---------------------`)
    console.log(`| ✅ ${msg}`);
    console.log(`+---------------------`)
    console.log('');
    return true;
}

function containerImage(name, longSHA) {
    return `${DOCKER_REGISTERY}/${GITHUB_OWNER}/${name}:${longSHA}`;
}

function byTagNameSemver(a, b) {
    const versionA = semver(a.tag_name);
    const versionB = semver(b.tag_name);
    return semver.gt(versionA, versionB) ? 1 : -1;
}

function fatal(...args) {
    console.error('');
    console.error(...args);
    console.error('aborted!');
    process.exit(1);
}

const yargs = _yargs(hideBin(process.argv));
yargs
    .usage('$0', 'publish a new release of the game', (cli) => {
        cli.positional('allow-dirty', {
            describe: 'skip git dirty checking',
            type: 'boolean'
        });
        cli.option('sequencer-private-key', {
            required: true,
            describe: 'private key for sequencer',
            default: process.env.SEQUENCER_PRIVATE_KEY,
            type: 'string'
        });
        cli.option('deployer-private-key', {
            required: true,
            describe: 'private key for deployer',
            default: process.env.DEPLOYER_PRIVATE_KEY,
            type: 'string'
        });
        cli.option('game-address', {
            describe: 'use an existing game address without deploying contracts',
            type: 'string'
        });
        cli.option('deployment-name', {
            required: true,
            describe: 'target deployment name',
            choices: ['test', 'exp'], // TODO: better name for deployments/networks
            type: 'string'
        });
        cli.option('dry-run', {
            describe: 'skip contract deploy, dump deploy config, and exit',
            type: 'boolean'
        });
        cli.option('interactive', {
            alias: 'i',
            describe: 'skip contract deploy, dump deploy config, and exit',
            type: 'boolean'
        });
        cli.middleware(async (ctx) => {
            if (!ctx.interactive) {
                return;
            }
            if (!ctx.deploymentName) {
                console.log('');
                ctx.deploymentName = await select({
                    message: 'Select a deployment to release to',
                    choices: [
                        {
                            name: 'test',
                            value: 'test',
                        },
                        {
                            name: 'exp',
                            value: 'exp',
                        },
                    ],
                });
                ctx['deployment-name'] = ctx.deploymentName;
            }
            if (!ctx.deployerPrivateKey) {
                console.log('');
                ctx.deployerPrivateKey = await password({ message: 'Enter the deployer private key' });
                if (!ctx.deployerPrivateKey) {
                    fatal('required');
                }
                ctx['deployer-private-key'] = ctx.deployerPrivateKey;
            }
            if (!ctx.sequencerPrivateKey) {
                console.log('');
                ctx.sequencerPrivateKey = await password({ message: 'Enter the sequencer private key' });
                if (!ctx.sequencerPrivateKey) {
                    fatal('required');
                }
                ctx['sequencer-private-key'] = ctx.sequencerPrivateKey;
            }
            console.log('');
            const ok = await confirm({ message: `This will deploy new instance of the Downstream game contracts, which will cost (fake) ETH, and then upgrade the ds-${ctx['deployment-name']} deployment. \n\nContinue with deployment?` });
            if (!ok) {
                fatal('');
            }

        }, true);
    }, async (ctx) => {
        try {
            await main(ctx);
        } catch (err) {
            console.error(`release failed:`, err);
        }
    })
    .version(false)
    .help()
    .showHelpOnFail(false, '')
    .wrap(Math.min(120, yargs.terminalWidth())).argv;
