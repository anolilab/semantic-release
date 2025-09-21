import dbg from "debug";
import singnale from "signale";

const { Signale } = singnale;
const severityOrder = ["error", "warn", "info", "debug", "trace"];
const assertLevel = (level, limit) => severityOrder.indexOf(level) <= severityOrder.indexOf(limit);
const aliases = {
    complete: "info",
    failure: "error",
    log: "info",
    success: "info",
};

const logger = {
    config: {
        _level: "info",
        _signale: {},
        _stderr: process.stderr,
        _stdout: process.stdout,
        set level(l) {
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
        get level() {
            return this._level;
        },
        set stdio([stderr, stdout]) {
            this._stdout = stdout;
            this._stderr = stderr;
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
        get stdio() {
            return [this._stderr, this._stdout];
        },
    },
    prefix: "msr:",
    withScope(prefix) {
        return {
            ...this,
            debug: dbg(prefix || this.prefix),
            prefix,
        };
    },
    // eslint-disable-next-line unicorn/no-array-reduce
    ...[...severityOrder, ...Object.keys(aliases)].reduce((m, l) => {
        // eslint-disable-next-line no-param-reassign,func-names
        m[l] = function (...arguments_) {
            if (assertLevel(aliases[l] || l, this.config.level)) {
                // eslint-disable-next-line no-console
                (this.config._signale[l] || console[l] || (() => {}))(this.prefix, ...arguments_);
            }
        };

        return m;
    }, {}),
    debug: dbg("msr:"),
};

export default logger;
