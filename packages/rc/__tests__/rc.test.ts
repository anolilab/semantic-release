import { rm } from "node:fs/promises";
import { env } from "node:process";

import { join } from "@visulima/path";
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rc } from "../src";

// Adds extention to the last item of an array representing fs path
const addExtensions = (sources: string[][]) =>
    // eslint-disable-next-line unicorn/no-array-reduce
    sources.reduce<string[][]>((accumulator, pathArray) => {
        ["", ".json"].forEach((extension) => {
            const current = [pathArray].flat();

            current[current.length - 1] += extension;
            accumulator.push(current);
        });

        return accumulator;
    }, []);

const mocks = vi.hoisted(() => {
    return { mockedCwd: vi.fn(), mockedHomeDir: vi.fn(), mockedIsAccessibleSync: vi.fn(), mockedReadFileSync: vi.fn() };
});

vi.mock("@visulima/fs", async () => {
    const actual = await vi.importActual("@visulima/fs");

    return {
        ...actual,
        isAccessibleSync: mocks.mockedIsAccessibleSync,
        readFileSync: mocks.mockedReadFileSync,
    };
});

vi.mock("node:os", () => {
    return {
        homedir: mocks.mockedHomeDir,
    };
});

vi.mock("node:process", async () => {
    const actual = await vi.importActual("node:process");

    return {
        ...actual,
        cwd: mocks.mockedCwd,
    };
});

describe(rc, () => {
    let cwdPath: string;
    let homePath: string;
    const npmEnvironment: Record<keyof typeof env, string | undefined> = {};

    beforeEach(async () => {
        cwdPath = temporaryDirectory();
        homePath = temporaryDirectory();

        mocks.mockedCwd.mockReturnValue(cwdPath);
        mocks.mockedHomeDir.mockReturnValue(homePath);

        // eslint-disable-next-line no-loops/no-loops,no-restricted-syntax
        for (const key in env) {
            if (key.startsWith("npm_")) {
                // eslint-disable-next-line security/detect-object-injection
                npmEnvironment[key as keyof typeof env] = env[key];
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection
                delete env[key];
            }
        }
    });

    afterEach(async () => {
        // eslint-disable-next-line no-loops/no-loops,no-restricted-syntax,guard-for-in
        for (const key in npmEnvironment) {
            // eslint-disable-next-line security/detect-object-injection
            env[key] = npmEnvironment[key];
        }

        await rm(cwdPath, { recursive: true });
        await rm(homePath, { recursive: true });
    });

    it("should return config defaults", () => {
        expect.assertions(1);

        mocks.mockedIsAccessibleSync.mockReturnValue(false);

        expect(rc("npm", { defaults: { test: 1 } })).toStrictEqual({
            config: {
                test: 1,
            },
            files: [],
        });
    });

    it("should find configs in home dir", () => {
        expect.assertions(1);

        const sources = addExtensions([
            [".config", "bem", "config"], // ~/.config/bem/config
            [".config", "bem"], // ~/.config/bem
            [".bem", "config"], // ~/.bem/config
            [".bemrc"], // ~/.bemrc
        ]);

        sources.forEach((pathToConfig: string[], index: number) => {
            mocks.mockedIsAccessibleSync.mockImplementation((file) => file === join(homePath, ...pathToConfig));
            mocks.mockedReadFileSync.mockImplementation((file) => {
                if (file === join(homePath, ...pathToConfig)) {
                    return JSON.stringify({ test: index });
                }

                return "";
            });
        });

        expect(rc("bem")).toStrictEqual({
            config: {
                test: 7,
            },
            files: [join(homePath, ".bemrc.json")],
        });
    });

    it("should find config by ENV", () => {
        expect.assertions(1);

        const filePath = "/test/.bemrc";

        mocks.mockedIsAccessibleSync.mockImplementation((file) => file === filePath);
        mocks.mockedReadFileSync.mockImplementation((file) => {
            if (file === filePath) {
                return JSON.stringify({ test: 1 });
            }

            return "";
        });

        env.bem_config = filePath;

        expect(rc("bem")).toStrictEqual({
            config: {
                test: 1,
            },
            files: ["/test/.bemrc"],
        });

        delete env.bem_config;
    });

    it("should use config field passed via ENV", () => {
        expect.assertions(1);

        env.bem_test = "1";

        mocks.mockedIsAccessibleSync.mockReturnValue(false);

        expect(rc("bem")).toStrictEqual({ config: { test: "1" }, files: [] });

        delete env.bem_test;
    });

    it("should find config by ENV with different name", () => {
        expect.assertions(1);

        const name = "ololo";

        const filePath = "/test/.npmrc";

        mocks.mockedIsAccessibleSync.mockImplementation((file) => file === filePath);
        mocks.mockedReadFileSync.mockImplementation((file) => {
            if (file === filePath) {
                return JSON.stringify({ test: 2 });
            }

            return "";
        });

        env[`${name}_test`] = "1";
        env[`${name}_something__subtest`] = "1";

        expect(rc(name)).toStrictEqual({
            config: {
                something: {
                    subtest: "1",
                },
                test: "1",
            },
            files: [],
        });

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete env[`${name}_test`];
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete env[`${name}_something__subtest`];
    });

    it("should find config in current folder", () => {
        expect.assertions(1);

        const filePath = ".bemrc";

        mocks.mockedIsAccessibleSync.mockImplementation((file) => file === join(cwdPath, filePath));
        mocks.mockedReadFileSync.mockImplementation((file) => {
            if (file === join(cwdPath, filePath)) {
                return JSON.stringify({ test: 1 });
            }

            return "";
        });

        expect(rc("bem")).toStrictEqual({
            config: {
                test: 1,
            },
            files: [join(cwdPath, filePath)],
        });
    });

    it("should find configs with different exts in current folder", () => {
        expect.assertions(1);

        const files = [".bem/config", ".bem/config.json", ".bemrc", ".bemrc.json"];

        mocks.mockedIsAccessibleSync.mockImplementation((file) => {
            // eslint-disable-next-line no-loops/no-loops
            for (const path of files) {
                if (file === join(cwdPath, path)) {
                    return true;
                }
            }

            return false;
        });
        mocks.mockedReadFileSync.mockImplementation((file) =>
            files
                .map((path, index) => {
                    if (file === join(cwdPath, path)) {
                        return JSON.stringify({ test: index });
                    }

                    return undefined;
                })
                .filter(Boolean)
                .join(""),
        );

        expect(rc("bem")).toStrictEqual({
            config: { test: 1 },
            files: [join(cwdPath, ".bemrc"), join(cwdPath, ".bemrc.json"), join(cwdPath, ".bem/config"), join(cwdPath, ".bem/config.json")],
        });
    });

    it("should find config with custom name in current folder", () => {
        expect.assertions(1);

        const filePath = ".ololorc";

        mocks.mockedIsAccessibleSync.mockImplementation((file) => file === join(cwdPath, filePath));
        mocks.mockedReadFileSync.mockImplementation((file) => {
            if (file === join(cwdPath, filePath)) {
                return JSON.stringify({ test: 1 });
            }

            return "";
        });

        expect(rc("ololo")).toStrictEqual({
            config: {
                test: 1,
            },
            files: [join(cwdPath, filePath)],
        });
    });

    it("should use .bemrc from /", () => {
        expect.assertions(1);

        const filePath = ".bemrc";

        mocks.mockedIsAccessibleSync.mockImplementation((file) => file === join("/", filePath));
        mocks.mockedReadFileSync.mockImplementation(() => JSON.stringify({ test: "root" }));

        expect(rc("bem")).toStrictEqual({ config: { test: "root" }, files: ["/.bemrc"] });
    });

    it("should filter same configs in proper order", () => {
        expect.assertions(1);

        const filePath = ".bemrc";

        mocks.mockedIsAccessibleSync.mockImplementation((file) => file === join("/", filePath) || file === join(homePath, filePath));
        mocks.mockedReadFileSync.mockImplementation((file) => {
            if (file === join("/", filePath)) {
                return JSON.stringify({ test: "root" });
            }

            if (file === join(homePath, filePath)) {
                return JSON.stringify({ test: 1 });
            }

            return "";
        });

        expect(rc("bem")).toStrictEqual({
            config: {
                test: "root",
            },
            files: [join(homePath, filePath), "/.bemrc"],
        });
    });

    it("should find different types of configs", () => {
        expect.assertions(1);

        const files = {
            1: join(cwdPath, "grandparent", "parent", "cwd", ".bemrc"),
            2: join(cwdPath, "grandparent", "parent", ".bemrc"),
            3: join(cwdPath, "grandparent", ".bemrc"),
            config: "/config/testfile",
            env_config: "/env/config/.bemrc",
            etc: "/etc/bemrc",
            home: join(homePath, ".bemrc"),
            root: "/.bemrc",
        };

        mocks.mockedCwd.mockReturnValue(join(cwdPath, "grandparent", "parent", "cwd"));
        mocks.mockedIsAccessibleSync.mockImplementation((file) => {
            // eslint-disable-next-line no-loops/no-loops
            for (const path of Object.values(files)) {
                if (file === path) {
                    return true;
                }
            }

            return false;
        });
        mocks.mockedReadFileSync.mockImplementation((file) =>
            Object.entries(files)
                .map(([value, path]) => {
                    if (file === path) {
                        return JSON.stringify({ last: value });
                    }

                    return undefined;
                })
                .filter(Boolean)
                .join(""),
        );

        env.bem_test = "env";
        env.bem_config = "/env/config/.bemrc";

        /**
         * 1 The defaults object you passed in
         * 2 `/etc/${appname}/config`
         * 3 `/etc/${appname}rc`
         * 4 `$HOME/.config/${appname}/config`
         * 5 `$HOME/.config/${appname}`
         * 6 `$HOME/.${appname}/config`
         * 7 `$HOME/.${appname}rc`
         * 8 a local `.${appname}/config` and `.${appname}rc` and all found looking in `./ ../ ../../ ../../../` etc.
         * 9 if you passed environment variable `${appname}_config` then from that file
         * 10 if you passed options.config variable, then from that file
         * 11 environment variables prefixed with `${appname}_`
         *   or use "\_\_" to indicate nested properties &lt;br/> _(e.g. `appname_foo__bar__baz` => `foo.bar.baz`)_
         */
        expect(rc("bem", { config: "/config/testfile", defaults: { default: "default" } })).toStrictEqual({
            config: {
                default: "default",
                last: "config",
                test: "env",
            },
            files: [
                // defaults
                join("/", "etc", "bemrc"), // home
                join(homePath, ".bemrc"), // home
                join("/", ".bemrc"), // root or 1
                join(cwdPath, "grandparent", ".bemrc"), // 2
                join(cwdPath, "grandparent", "parent", ".bemrc"), // 3
                join(cwdPath, "grandparent", "parent", "cwd", ".bemrc"), // 4
                join("/", "env", "config", ".bemrc"), // env
                "/config/testfile", // config
            ],
        });

        delete env.bem_test;
        delete env.bem_config;
    });
});
