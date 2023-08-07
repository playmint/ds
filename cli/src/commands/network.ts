import { networks } from '../utils/networks';

const command = {
    command: 'networks',
    describe: 'list network configurations',
    handler: (ctx) => {
        ctx.output.write(networks);
    },
};

export default command;
