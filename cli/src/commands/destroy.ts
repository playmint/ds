import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';
import { Op, getOpsForManifests } from '../utils/destroyer';
import { readManifestsDocumentsSync } from '../utils/manifest';
import { getZone, getGlobal } from './get';

type OpResult = {
    ok: boolean;
    err?: unknown;
    op: Op;
};

export const getManifestFilenames = (filename: string, isRecursive: boolean): string[] => {
    if (filename === '-') {
        return [filename];
    }
    const isDirectory = fs.lstatSync(filename).isDirectory();
    if (isDirectory) {
        if (!isRecursive) {
            throw new Error(`${filename} is a directory. use --recursive to destroy all manifests in a directory`);
        }
        // must be posix path, even on windows
        const globPath = path.join(filename, '**/*.{yaml,yml}').replace(/\\/g, '/');
        return globSync(globPath, { follow: true });
    } else if (isRecursive) {
        throw new Error(`--filename must be a directory when used with --recursive`);
    } else {
        return [filename];
    }
};

const destroy = {
    command: 'destroy',
    describe: 'destroy an extension configuration from the game',
    builder: (yargs) =>
        yargs
            .option('filename', {
                alias: 'f',
                describe:
                    'path to manifest or dir that contain the configurations to destroy, use "-" to read from stdin',
                demandOption: true,
                type: 'string',
            })
            .option('recursive', {
                alias: 'R',
                describe:
                    'process the directory used in -f, --filename recursively. Useful when you want to manage related manifests organized within the same directory',
                type: '',
            })
            .option('zone', {
                alias: 'z',
                demandOption: true,
                describe: 'id of the zone/island to deploy in to',
                type: 'string',
            })
            .option('dry-run', {
                describe: 'show changes that would be destroyed',
                type: 'boolean',
            })
            .option('max-connections', {
                describe: 'max number of connections to use for submitting parallel tx',
                type: 'number',
                default: 250,
            })
            .check((ctx) => {
                if (ctx.filename === '-') {
                    return true;
                }
                if (!fs.existsSync(ctx.filename)) {
                    throw new Error(`file not found: ${ctx.filename}`);
                }
                return true;
            })
            .demand(['filename'])
            .example([
                ['$0 destroy -f ./manifest.yaml', 'Destroy a single manifest'],
                ['$0 destroy -R -f .', 'Destroy ALL manifests in directory'],
            ]),
    handler: async (ctx) => {
        if (ctx.zone < 1) {
            throw new Error('invalid zone id');
        }
        const manifestFilenames = getManifestFilenames(ctx.filename, ctx.recursive);
        const docs = (await Promise.all(manifestFilenames.map(readManifestsDocumentsSync))).flatMap((docs) => docs);
      
        const zone = await getZone(ctx);
        const global = await getGlobal(ctx);

        const opsets = await getOpsForManifests(docs, zone, global);

        // abort here if dry-run
        if (ctx.dryRun) {
            console.error('The following actions will be performed:');
            console.error(
                opsets
                    .flatMap((op) =>
                        op.flatMap(({ actions }) =>
                            actions.map(
                                (op) => `    ${op.name}(${op.args.map((arg) => JSON.stringify(arg)).join(', ')})`
                            )
                        )
                    )
                    .join('\n')
            );
            console.error('');
            process.exit(0);
        }

        // authenticate player
        const player = await ctx.player();

        // destroy the ops
        let results: OpResult[] = [];
        for (let i = 0; i < opsets.length; i++) {
            // batch up the op in the opset to avoid opening too many
            // connections at once
            const batches = batched(opsets[i], ctx.maxConnections);
            for (let j = 0; j < batches.length; j++) {
                const pending = batches[j].map(async (op) => {
                    if (op.inBounds === false) {
                        console.log(`❌ ${op.note} - out of bounds\n`);
                        return {
                            ok: false,
                            err: 'coords were out of bounds',
                            op,
                        };
                    }
                    let retries = 0;
                    while (retries < 5) {
                        try {
                            await player.dispatchAndWait(...op.actions);
                            console.log(`✅ ${op.note}\n`);
                            return {
                                ok: true,
                                op,
                            };
                        } catch (err) {
                            if (retries === 4) {
                                console.log(`❌ ${op.note}\n`);
                                return {
                                    ok: false,
                                    err,
                                    op,
                                };
                            } else {
                                console.log(`🕒 retrying: ${op.note}\n`);
                            }
                        }
                        retries++;
                    }
                    return {
                        ok: false,
                        err: `retries exceeded`,
                        op,
                    };
                });
                const res = await Promise.all(pending);
                results = [...results, ...res];
            }
        }

        // report any failures
        const errs = results
            .filter((res) => !res.ok)
            .map(
                (res) =>
                    `file: ${res.op.doc.filename}\nerror:${res.err || 'unknown'}\nactions:${JSON.stringify(
                        res.op.actions
                    )}`
            );
        if (errs.length > 0) {
            console.error(`\n${errs.length} manifests failed to destroy:\n\n${errs.join('\n\n')}`);
            process.exit(1);
        }

        // done!
        process.exit(0);
    },
};

export default destroy;

function batched<T>(input: T[], perChunk: number): T[][] {
    return input.reduce((output, item, index) => {
        const chunkIndex = Math.floor(index / perChunk);

        if (!output[chunkIndex]) {
            output[chunkIndex] = []; // start a new chunk
        }

        output[chunkIndex].push(item);

        return output;
    }, [] as T[][]);
}
