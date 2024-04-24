#!/usr/bin/env node

import _yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Octokit, App } from "octokit";
import { execSync, exec } from 'child_process';
import fs from 'fs';

const GITHUB_OWNER = 'playmint';
const DOCKER_REGISTERY = 'ghcr.io';

async function main({out}) {

    const octokit = new Octokit({});

    // fetch origin
    execSync(`git fetch origin --no-recurse-submodules`);

    // get the current commit
    const longSHA = execSync(`git rev-parse origin/main`).toString().trim();

    // get the expected image names
    const images = {
        contracts: containerImage('ds-contracts', longSHA),
        services: containerImage('ds-services', longSHA),
        shell: containerImage('ds-shell', longSHA),
    };

    // check that there are docker builds for this commit otherwise there
    // will be nothing to run!
    for (const image of Object.values(images)) {
        await check(`docker image ${image.split('/').slice(-1)}`, () => {
            execSync(`docker manifest inspect ${image}`);
        });
    };

    const output = JSON.stringify({version: longSHA});
    if (out) {
        fs.writeFileSync(out, output);
    } else {
        console.log(output);
    }
    process.exit(0);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function check(msg, fn) {
    try {
        const ok = await Promise.resolve(fn());
        if (ok === false) {
            throw new Error('not ok');
        }
    } catch (err) {
        fatal(err.message);
        return false;
    }
    return true;
}

function containerImage(name, longSHA) {
    return `${DOCKER_REGISTERY}/${GITHUB_OWNER}/${name}:${longSHA}`;
}

function fatal(...args) {
    console.error('');
    console.error(...args);
    console.error('aborted!');
    process.exit(1);
}

const yargs = _yargs(hideBin(process.argv));
yargs
    .option('out', {
        alias: 'o',
        describe: 'write output to file',
        type: 'string',
    })
    .usage('$0', 'check images exist for current git sha', (cli) => {}, async (ctx) => {
        try {
            await main(ctx);
        } catch (err) {
            console.error(`aborted:`, err);
        }
    })
    .version(false)
    .help()
    .showHelpOnFail(false, '')
    .wrap(Math.min(120, yargs.terminalWidth())).argv;
