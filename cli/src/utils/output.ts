import YAML from 'yaml';
import Table from 'cli-table3';

interface TableOpts {
    truncate?: boolean;
}

function truncate(v: any): string {
    if (typeof v !== 'string') {
        return v;
    }
    if (v.startsWith('0x')) {
        return `0x..${v.slice(-9)}`;
    }
    return v.length > 24 ? `${v.slice(0, 24)}...` : v;
}

function printTable(args: any[], opts: TableOpts) {
    if (args.length === 0) {
        console.log('No results');
        return;
    }
    const head = Object.keys(args[0]);
    const table = new Table({
        head,
    });
    args.forEach((arg) =>
        table.push(
            head.reduce((o, key, idx) => {
                if (typeof arg[key] === 'object') {
                    o[idx] = JSON.stringify(arg[key]);
                } else {
                    o[idx] = arg[key] || '';
                    if (opts.truncate) {
                        o[idx] = truncate(o[idx]);
                    }
                }
                return o;
            }, [] as any[])
        )
    );
    console.log(table.toString());
}

export function output(ctx) {
    ctx.output = {
        write: (args: any[]) => {
            if (ctx.format == 'json') {
                const data = args.map((d) => JSON.stringify(d, null, 4));
                console.log(...data);
            } else if (ctx.format === 'yaml') {
                console.log(
                    `${args.length > 0 ? '\n---\n' : ''}${args.map((arg) => YAML.stringify(arg)).join('\n---\n')}`
                );
            } else if (ctx.format === 'table') {
                printTable(args, { truncate: false });
            } else {
                throw new Error(`unknown output format: ${ctx.o}`);
            }
        },
    };
}
