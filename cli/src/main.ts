#!/usr/bin/env node
import _yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { networks } from './utils/networks';
import { client } from './utils/services';
import { output } from './utils/output';

import actions from './commands/actions';
import network from './commands/network';
import item from './commands/items';

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
    .middleware(client)
    .middleware(output)
    .command(actions)
    .command(network)
    .command(item)
    .demandCommand()
    .help()
    .wrap(Math.min(120, yargs.terminalWidth())).argv;
