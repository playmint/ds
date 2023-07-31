export function output(ctx) {
    ctx.output = {
        write: (...args) => {
            if (ctx.format == 'json') {
                const data = args.map((d) => JSON.stringify(d, null, 4));
                console.log(...data);
            } else if (ctx.format === 'table') {
                console.table(...args);
            } else {
                throw new Error(`unknown output format: ${ctx.o}`);
            }
        },
    };
}
