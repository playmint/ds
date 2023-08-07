#!/usr/bin/env node
import _yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { networks } from './utils/networks';
import { session } from './utils/session';
import { output } from './utils/output';

import actions from './commands/actions';
import network from './commands/network';
import getter from './commands/get';
import apply from './commands/apply';

const yargs = _yargs(hideBin(process.argv));

yargs
    .option('network', {
        alias: 'n',
        demandOption: true,
        default: 'mainnet',
        describe: 'select network (see networks list)',
        choices: networks.map((n) => n.name),
        type: 'string',
    })
    .option('format', {
        alias: 'o',
        demandOption: true,
        default: 'table',
        describe: 'output format',
        choices: ['json', 'table'] as const,
        type: 'string',
    })
    .option('private-key', {
        alias: 'k',
        demandOption: true,
        default: 'table',
        describe: 'player private key (insecure!)',
        type: 'string',
    })
    .middleware(session)
    .middleware(output)
    .command(actions)
    .command(network)
    .command(getter)
    .command(apply)
    .demandCommand()
    .help()
    .wrap(Math.min(120, yargs.terminalWidth())).argv;
