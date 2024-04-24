#!/usr/bin/env node
import _yargs from 'yargs';
import packageJSON from '../package.json';
import { hideBin } from 'yargs/helpers';
import { networks } from './utils/networks';
import { session } from './utils/session';
import { updater } from './utils/updater';
import { output } from './utils/output';

import { actions, dispatch } from './commands/actions';
import config from './commands/config';
import getter from './commands/get';
import apply from './commands/apply';
import destroy from './commands/destroy';
import { test } from './commands/test';
import chalk from 'chalk';
import { offset } from './commands/offset';

const yargs = _yargs(hideBin(process.argv));

yargs
    .fail(function (msg, err, yargs) {
        console.error('');
        yargs.showHelp();
        if (err && err.message) {
            console.error('');
            console.error(chalk.red(err.message));
        }
        if (msg) {
            console.error('');
            console.error(chalk.red(msg));
        }
        console.error('');
        process.exit(1);
    })
    .option('verbose', {
        alias: 'v',
        default: false,
        describe: 'verbose and debug logging',
        type: 'boolean',
    })
    .option('network', {
        alias: 'n',
        demandOption: true,
        default: 'local',
        describe: 'select network (see networks list)',
        choices: networks.map((n) => n.name),
        type: 'string',
    })
    .option('auth', {
        demandOption: true,
        default: 'browser',
        describe: 'authentication method',
        choices: ['browser', 'walletconnect', 'private-key'],
        type: 'string',
    })
    .option('ws-endpoint', {
        describe: 'override websocket query endpoint',
        type: 'string',
    })
    .option('http-endpoint', {
        describe: 'override http query endpoint',
        type: 'string',
    })
    .option('format', {
        alias: 'o',
        demandOption: true,
        default: 'table',
        describe: 'output format',
        choices: ['json', 'yaml', 'table'] as const,
        type: 'string',
    })
    .option('status', {
        default: true,
        describe: 'hide status field from output',
        type: 'boolean',
    })
    .option('private-key', {
        alias: 'k',
        describe: 'player private key (implies --auth private-key)',
        type: 'string',
    })
    .middleware(session)
    .middleware(output)
    .middleware(updater)
    .command(actions)
    .command(dispatch)
    .command(config)
    .command(getter)
    .command(apply)
    .command(destroy)
    .command(test)
    .command(offset)
    .command({
        command: 'version',
        describe: 'show the current version and exit',
        handler: () => {
            console.log(packageJSON.version);
        },
    })
    .demandCommand()
    .version(false)
    .help()
    .wrap(Math.min(120, yargs.terminalWidth())).argv;
