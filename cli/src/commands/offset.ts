import fs from 'fs';
import { getManifestFilenames } from './apply';
import { ManifestDocument, readManifestsDocumentsSync } from '../utils/manifest';
import { z } from 'zod';
import YAML from 'yaml';

export const offset = {
    command: 'offset <coordinate>',
    describe: 'offset a manifest document by the given qrs coordinate and output the result to stdout.',
    builder: (yargs) =>
        yargs
            .positional('coordinate', { describe: 'the qrs coordinate to offset the document by', type: 'string' })
            .option('filename', {
                alias: 'f',
                describe: 'path to manifest that contain the configurations to apply, use "-" to read from stdin',
                type: 'string',
            })
            .option('recursive', {
                alias: 'R',
                describe:
                    'process the directory used in -f, --filename recursively. Useful when you want to manage related manifests organized within the same directory',
                type: '',
            })
            .check((ctx) => {
                const coord = ctx.coordinate.split(',').map((c: string) => parseInt(c));
                if (coord.length !== 3) {
                    throw new Error('invalid coord; must be in the format "q,r,s"');
                }

                const coordSum = coord.reduce((a, b) => a + b, 0);
                if (coordSum !== 0) {
                    throw new Error('invalid coord; qrs coordinates must sum to 0');
                }

                return true;
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
            .example([[`$0 offset 0,2,-2 -f ./map.yaml`, `Offset a single map`]]),
    handler: async (ctx) => {
        const offsetCoord = ctx.coordinate.split(',').map((c: string) => parseInt(c));

        const manifestFilenames = getManifestFilenames(ctx.filename, ctx.recursive);
        const docs = (await Promise.all(manifestFilenames.map(readManifestsDocumentsSync))).flatMap((docs) => docs);

        const offsetDocs = docs.map((doc) => offsetDocument(doc, offsetCoord));
        const yamlDocs = offsetDocs.map((doc) => YAML.stringify(doc.manifest));

        yamlDocs.forEach((doc) => console.log(`---\n${doc}`));
    },
};

const offsetDocument = (doc: z.infer<typeof ManifestDocument>, offsetCoord: [number, number, number]) => {
    if ('location' in doc.manifest.spec && doc.manifest.spec.location !== undefined) {
        doc.manifest.spec.location = doc.manifest.spec.location.map((elm, index) => elm + offsetCoord[index]) as [
            number,
            number,
            number
        ];
    }

    return doc;
};
