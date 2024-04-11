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

const IS_SLOT = /materials|inputs|outputs/;

function toTable(args: any[], opts: TableOpts) {
    const head = Object.keys(args[0]);
    const table = new Table({
        head,
    });
    args.forEach((arg) =>
        table.push(
            head.reduce((o, key, idx) => {
                const v = arg[key];
                if (Array.isArray(v) && v.length === 0) {
                    o[idx] = undefined;
                } else if (Array.isArray(v) && IS_SLOT.test(key)) {
                    o[idx] = v
                        .concat([null, null, null, null])
                        .slice(0, 4)
                        .map((slot) => (slot ? `${slot.quantity}x ${slot.name}` : ''))
                        .join('\n');
                } else if (typeof v === 'object') {
                    o[idx] = YAML.stringify(v);
                } else {
                    o[idx] = v || '';
                    if (opts.truncate) {
                        o[idx] = truncate(o[idx]);
                    }
                }
                return o;
            }, [] as any[])
        )
    );
    return table;
}

const toStringDefaults = { indentSeq: false };

const toYAML = (o: any): string => {
    const doc = new YAML.Document(o, { toStringDefaults });
    const specField: any = doc.get('spec');
    if (specField) {
        const locField: any = specField.get('location');
        if (locField) {
            locField.flow = true; // always inline coords
        }
    }
    return doc.toString();
};

export function output(ctx) {
    ctx.output = {
        write: (entities: any[]) => {
            let args: any[] = [];
            try {
                if (entities && typeof entities.map === 'function') {
                    args = entities.map((entity) => {
                        const o = { ...entity };
                        if (ctx.status === false && o.status) {
                            delete o.status;
                        }
                        return o;
                    });
                }
            } catch (e) {
                console.warn('executed ok, but failed to format output', e);
            }
            if (ctx.format == 'json') {
                const data = args.map((d) => JSON.stringify(d, null, 4));
                console.log(...data);
            } else if (ctx.format === 'yaml') {
                const data = `${args.length > 0 ? '\n---\n' : ''}${args.map(toYAML).join('\n---\n')}`;
                console.log(data);
            } else if (ctx.format === 'table') {
                if (args.length === 0) {
                    console.log('No results');
                    return;
                }
                const table = toTable(args, { truncate: false });
                console.log(table.toString());
            } else {
                throw new Error(`unknown output format: ${ctx.o}`);
            }
        },
    };
}
