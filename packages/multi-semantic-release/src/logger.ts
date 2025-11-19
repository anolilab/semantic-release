import dbg from "debug";
import signale from "signale";

const { Signale } = signale;

const severityOrder = ["error", "warn", "info", "debug", "trace"] as const;

const assertLevel = (level: string, limit: string): boolean => {
    const levelIndex = severityOrder.indexOf(level as (typeof severityOrder)[number]);
    const limitIndex = severityOrder.indexOf(limit as (typeof severityOrder)[number]);

    return levelIndex !== -1 && limitIndex !== -1 && levelIndex <= limitIndex;
};

const aliases = {
    complete: "info",
    failure: "error",
    log: "info",
    success: "info",
} as const;

interface LoggerConfig {
    _level: string;
    _signale: Record<string, unknown>;
    _stderr: NodeJS.WriteStream;
    _stdout: NodeJS.WriteStream;
    level: string;
    stdio: [NodeJS.WriteStream, NodeJS.WriteStream];
}

interface Logger {
    [key: string]: unknown;
    complete: (...args: unknown[]) => void;
    config: LoggerConfig;
    debug: dbg.Debugger;
    error: (...args: unknown[]) => void;
    failure: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    log: (...args: unknown[]) => void;
    prefix: string;
    success: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    withScope: (prefix: string) => Logger;
}

const logger: Logger = {
    config: {
        _level: "info",
        _signale: {} as Record<string, unknown>,
        _stderr: process.stderr,
        _stdout: process.stdout,
        set level(l: string) {
            if (!l) {
                return;
            }

            if (assertLevel(l, "debug")) {
                dbg.enable("msr:");
            }

            if (assertLevel(l, "trace")) {
                dbg.enable("semantic-release:");
            }

            this._level = l;
        },
        get level(): string {
            return this._level;
        },
        set stdio([stderr, stdout]: [NodeJS.WriteStream, NodeJS.WriteStream]) {
            this._stdout = stdout;
            this._stderr = stderr;
            // eslint-disable-next-line sonarjs/confidential-information-logging
            this._signale = new Signale({
                config: { displayLabel: false, displayTimestamp: true },
                stream: stdout,
                types: {
                    complete: { badge: "🎉", color: "green", label: "", stream: [stdout] },
                    error: { badge: "✖", color: "red", label: "", stream: [stderr] },
                    log: { badge: "•", color: "magenta", label: "", stream: [stdout] },
                    success: { badge: "✔", color: "green", label: "", stream: [stdout] },
                },
            }) as unknown as Record<string, unknown>;
        },
        get stdio(): [NodeJS.WriteStream, NodeJS.WriteStream] {
            return [this._stderr, this._stdout];
        },
    },
    prefix: "msr:",
    withScope(prefix: string): Logger {
        return {
            ...this,
            debug: dbg(prefix || this.prefix),
            prefix,
        };
    },
    // eslint-disable-next-line unicorn/no-array-reduce
    ...(([...severityOrder, ...Object.keys(aliases)] as const).reduce(
        (m: Record<string, (...args: unknown[]) => void>, l: string) => {
            // eslint-disable-next-line no-param-reassign,func-names
            m[l] = function (...arguments_: unknown[]) {
                if (assertLevel(aliases[l as keyof typeof aliases] || l, (this as Logger).config.level)) {
                    const signaleInstance = (this as Logger).config._signale as Record<string, unknown>;
                    const logFunction
                        = (signaleInstance[l] as ((...args: unknown[]) => void) | undefined)
                        // eslint-disable-next-line no-console
                            || (console[l as keyof Console] as ((...args: unknown[]) => void) | undefined)
                            || (() => {});

                    logFunction((this as Logger).prefix, ...arguments_);
                }
            };

            return m;
        },
        {} as Record<string, (...args: unknown[]) => void>,
    ) as Pick<Logger, "complete" | "error" | "failure" | "info" | "log" | "success" | "warn">),
    debug: dbg("msr:"),
};

export default logger;
