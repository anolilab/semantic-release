import dbg from "debug";
import singnale from "signale";

const { Signale } = singnale;
const severityOrder = ["error", "warn", "info", "debug", "trace"] as const;
const assertLevel = (level: string, limit: string): boolean => severityOrder.indexOf(level) <= severityOrder.indexOf(limit);
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
    config: LoggerConfig;
    debug: dbg.Debugger;
    prefix: string;
    withScope: (prefix: string) => Logger;
}

const logger: Logger = {
    config: {
        _level: "info",
        _signale: {},
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
                // scope: "multirelease",
                stream: stdout,
                types: {
                    complete: { badge: "🎉", color: "green", label: "", stream: [stdout] },
                    error: { color: "red", label: "", stream: [stderr] },
                    log: { badge: "•", color: "magenta", label: "", stream: [stdout] },
                    success: { color: "green", label: "", stream: [stdout] },
                },
            });
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
    ...([...severityOrder, ...Object.keys(aliases)] as const).reduce(
        (m: Record<string, (...args: unknown[]) => void>, l: string) => {
            // eslint-disable-next-line no-param-reassign,func-names
            m[l] = function (...arguments_: unknown[]) {
                if (assertLevel(aliases[l as keyof typeof aliases] || l, this.config.level)) {
                    // eslint-disable-next-line no-console
                    const logFunction = this.config._signale[l] || console[l as keyof Console] || (() => {});

                    logFunction(this.prefix, ...arguments_);
                }
            };

            return m;
        },
        {} as Record<string, (...args: unknown[]) => void>,
    ),
    debug: dbg("msr:"),
};

export default logger;
