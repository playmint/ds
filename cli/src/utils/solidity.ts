import solc from 'solc';
import fs from 'fs';
import path from 'path';

export const remappings = [
    ['@ds/', path.join(__dirname, 'contracts/')],
    ['cog/', path.join(__dirname, 'contracts/cog/')],
];

interface CompileOpts {
    libs?: string[];
    verbose?: boolean;
}

export async function compile(filepath: string, opts: CompileOpts) {
    const filename = path.basename(filepath);
    const content = fs.readFileSync(filepath, 'utf8');

    const findImports = (importpath: string) => {
        for (const [from, to] of remappings) {
            if (importpath.startsWith(from)) {
                importpath = importpath.replace(from, to);
                break;
            }
        }

        const tried: string[] = [];

        if (path.isAbsolute(importpath)) {
            tried.push(importpath);
            if (fs.existsSync(importpath)) {
                const contents = fs.readFileSync(importpath).toString();
                return { contents };
            }
        } else {
            for (const lib of opts.libs || []) {
                const trypath = path.join(lib, importpath);
                tried.push(trypath);
                if (fs.existsSync(trypath)) {
                    const contents = fs.readFileSync(trypath).toString();
                    return { contents };
                }
            }
        }

        if (opts.verbose) {
            console.warn(`compile: failed to find ${filepath} tried:`, tried);
        }
        return { error: 'File not found' };
    };

    const input = {
        language: 'Solidity',
        sources: {
            [filename]: { content: content.toString() },
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*'],
                },
            },
        },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

    if (output.errors && output.errors.length > 0) {
        const warns = output.errors
            .filter((e) => e.severity === 'warning')
            .map((e) => e.formattedMessage)
            .join('\n---\n');
        console.warn(warns);
        const errs = output.errors
            .filter((e) => e.severity === 'error')
            .map((e) => e.formattedMessage)
            .join('\n---\n');
        if (errs.length > 0) {
            throw new Error(errs);
        }
    }

    const contracts = output.contracts[filename];
    const bytecodes = Object.keys(contracts).map((contractName) => ({
        name: contractName,
        bytecode: contracts[contractName].evm.bytecode.object,
    }));

    if (bytecodes.length < 1) {
        throw new Error(`no bytecode generated for: ${filename}`);
    } else if (bytecodes.length > 1) {
        throw new Error(
            `multiple contract bytecode found for ${filename} so ambiguous which one to pick: ${bytecodes
                .map((b) => b.name)
                .join(',')}`
        );
    }
    const data = bytecodes.find(() => true);
    if (!data) {
        throw new Error(`no bytecode found`);
    }
    return data;
}
