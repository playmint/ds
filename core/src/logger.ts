export enum StructuredLogLevel {
    DEBUG,
    LOG,
    INFO,
    WARN,
    ERROR,
}

export type StructuredLogValue = string | number;
export type StructuredLogValues = { [key: string]: StructuredLogValue };

export interface StructuredLog {
    level: StructuredLogLevel;
    text: string;
    values: StructuredLogValues;
}
export interface StructuredLogger {
    send: (o: StructuredLog) => void;
    log: (msg: string, ...args: any) => void;
    info: (msg: string, ...args: any) => void;
    warn: (msg: string, ...args: any) => void;
    error: (msg: string, ...args: any) => void;
    debug: (msg: string, ...args: any) => void;
    with: (values: StructuredLogValues) => StructuredLogger;
}

export interface StructuredLoggerConfig {
    values: StructuredLogValues;
    sink: (o: StructuredLog) => void;
}

export class Logger implements StructuredLogger {
    values: StructuredLogValues = {};
    sink?: (o: StructuredLog) => void;

    constructor(cfg?: StructuredLoggerConfig) {
        const { values, sink } = cfg || {};
        if (values) {
            this.values = values;
        }
        if (sink) {
            this.sink = sink;
        }
    }

    send({ level, text, values }: StructuredLog) {
        const vs = { ...this.values, ...values };
        if (this.sink) {
            return this.sink({ level, text, values: vs });
        }
        // FIXME: dumping to console log is temporary, make this emit a stream
        // that client can listen to and render
        if (level === StructuredLogLevel.ERROR) {
            console.error(`[dslog] ${text}`, vs);
        } else if (level === StructuredLogLevel.WARN) {
            console.warn(`[dslog] ${text}`, vs);
        } else {
            console.log(`[dslog] ${text}`, vs);
        }
    }

    debug(text: string, values: StructuredLogValues) {
        this.send({ level: StructuredLogLevel.LOG, text, values });
    }

    log(text: string, values: StructuredLogValues) {
        this.send({ level: StructuredLogLevel.LOG, text, values });
    }

    info(text: string, values: StructuredLogValues) {
        this.send({ level: StructuredLogLevel.INFO, text, values });
    }

    warn(text: string, values: StructuredLogValues) {
        this.send({ level: StructuredLogLevel.WARN, text, values });
    }

    error(text: string, err: any, values: StructuredLogValues) {
        this.send({ level: StructuredLogLevel.ERROR, text, values });
    }

    with(values: StructuredLogValues): StructuredLogger {
        return new Logger({ values, sink: (...args) => this.send(...args) });
    }
}
