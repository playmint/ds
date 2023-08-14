import { Log, LoggerConfig, LogLevel } from './types';
import { makeSubject } from 'wonka';

/**
 * Creates a Logger which writes it's logs to a log Source that can later be subscribed to for
 * processing.
 *
 * ```ts
 *
 *  // create a logger
 *  const { logger, logs } = makeLogger({ name: 'main' });
 *
 *  // wire it up to something to consume the logs
 *  const { unsubscribe } = pipe(
 *      logs,
 *      subscribe((log) => {})
 *  );
 *
 *  // use it
 *  logger.warn('arrg!');
 *
 *  // wrap it
 *  sublogger = logger.with({ name: 'sub', values: {component: 'my-sublogger'} });
 *  sublogger.error('bang!');
 *
 * ```
 *
 * there is no setLogLevel type thing, you are expected to filter the logs stream as required.
 *
 */
export function makeLogger(opts: LoggerConfig) {
    const { source: logs, next: sender } = makeSubject<Log>();
    const logger = new Logger({ ...opts, sender });
    return { logger, logs };
}

/**
 *  toConsole pretty-prints Log messages to the console.
 *  it's useful if you need to tap into the log stream for debugging.
 *
 * ```ts
 *
 *  pipe(
 *      logs,
 *      tap(toConsole),
 *      someRealSink,
 *  )
 *
 * ```
 *
 */
export function toConsole({ level, text, values }: Log) {
    const style = ['color: black', 'background: red', 'padding: 2px 1px'];
    console.log('%c%s%c%s', style.join(';'), LogLevelNames[level], [], ` ${text}`, values);
}

export const LogLevelNames = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.LOG]: 'LOG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
} as const;

/**
 * Logger is a console.log sttyle wrapper around sending Log messages to a log stream.
 *
 * A Logger has a name, which helps know where the log message came from.
 *
 * ```ts
 *  const logger = new Logger({name: 'my-logger'});
 *  logger.log('hello');
 * ```
 *
 * A Logger can have some values that can be used to pass some structured data along with logs
 *
 * ```ts
 *  const logger = new Logger({name: 'my-logger', values: {user: 'jeff'}});
 * ```
 *
 * A new Logger can be created from an existing logger to inherit it's values and sender
 *
 * ```ts
 *  const subLogger = parentLogger.with({name: 'sub-logger', values: {extra,vals});
 * ```
 *
 */
export class Logger {
    constructor(readonly cfg: LoggerConfig) {}

    private sendUnstructured(level: LogLevel, ...args: any[]) {
        const text = args.map((arg) => arg.toString()).join(' ');
        const timestamp = new Date();
        this.send({ level, text, timestamp, values: {} });
    }

    public send({ level, text, timestamp, values }: Omit<Log, 'name'>, subloggerName?: string): void {
        if (this.cfg.level && level < this.cfg.level) {
            return;
        }
        const vs = { ...(this.cfg.values || {}), ...values };
        const name = subloggerName ? `${this.cfg.name}: ${subloggerName}` : this.cfg.name || 'logger';
        const log = { name, level, text, values: vs };
        if (!this.cfg.sender) {
            console.warn('no log sender provided', log);
            return;
        }
        return this.cfg.sender({ name, timestamp, level, text, values: vs });
    }

    public debug(...args: any[]) {
        this.sendUnstructured(LogLevel.DEBUG, ...args);
    }

    public log(...args: any[]) {
        this.sendUnstructured(LogLevel.LOG, ...args);
    }

    public info(...args: any[]) {
        this.sendUnstructured(LogLevel.INFO, ...args);
    }

    public warn(...args: any[]) {
        this.sendUnstructured(LogLevel.WARN, ...args);
    }

    public error(...args: any[]) {
        this.sendUnstructured(LogLevel.ERROR, ...args);
    }

    with({ name, values }: LoggerConfig): Logger {
        return new Logger({
            name,
            values: { ...(this.cfg.values || {}), ...values },
            sender: (log) => this.send(log, name),
            level: this.cfg.level,
        });
    }
}
