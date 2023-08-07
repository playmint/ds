import { networks } from '../utils/networks';
import { remappings } from '../utils/solidity';

const getNetworks = {
    command: 'get-networks',
    describe: 'list network configurations',
    handler: (ctx) => {
        ctx.output.write(networks);
    },
};

const getRemappings = {
    command: 'get-remappings',
    describe: 'export solidity remappings.txt to allow external tools to find the `import "@ds/" prefix`',
    builder: (cli) => {
        cli.example([['$0 config get-remappings > remappings.txt']]);
    },
    handler: (_ctx) => {
        console.log('');
        console.log(`# solidity remappings to import @ds files from the`);
        console.log(`# location where @playmint/ds-cli is installed by npm`);
        console.log(remappings.map(([from, to]) => `${from}=${to}`).join('\n'));
    },
};

const command = {
    command: 'config',
    describe: 'list network configurations',
    builder: (cli) => {
        cli.command(getNetworks);
        cli.command(getRemappings);
        cli.demandCommand();
    },
};

export default command;
