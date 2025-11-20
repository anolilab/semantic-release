import { ensureFileSync } from "@visulima/fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import getNpmrcPath from "../../../src/utils/get-npmrc-path";

const mocks = vi.hoisted(() => {
    return {
        mockedEnsureFileSync: vi.fn(),

        mockedIsAccessibleSync: vi.fn(),

        mockedResolve: vi.fn(),
    };
});

vi.mock(import("@visulima/fs"), async () => {
    const actual = await vi.importActual("@visulima/fs");

    return {
        ...actual,
        ensureFileSync: mocks.mockedEnsureFileSync,
        isAccessibleSync: mocks.mockedIsAccessibleSync,
    };
});

vi.mock(import("@visulima/path"), async () => {
    const actual = await vi.importActual("@visulima/path");

    return {
        ...actual,
        resolve: mocks.mockedResolve,
    };
});

describe(getNpmrcPath, () => {
    const cwd = "/test/directory";
    const npmrcPath = "/test/directory/.npmrc";

    beforeEach(() => {
        vi.clearAllMocks();

        mocks.mockedResolve.mockReturnValue(npmrcPath);
    });

    it("should return NPM_CONFIG_USERCONFIG if it is set and accessible", () => {
        expect.assertions(2);

        const environment = { NPM_CONFIG_USERCONFIG: "/custom/path/.npmrc" };

        mocks.mockedIsAccessibleSync.mockReturnValueOnce(true);

        const result = getNpmrcPath(cwd, environment);

        expect(result).toBe(environment.NPM_CONFIG_USERCONFIG);
        expect(mocks.mockedIsAccessibleSync).toHaveBeenCalledWith(environment.NPM_CONFIG_USERCONFIG);
    });

    it("should return the resolved .npmrc path if it is accessible", () => {
        expect.assertions(2);

        const environment = {};

        mocks.mockedIsAccessibleSync.mockImplementation((path: string) => path === npmrcPath);

        const result = getNpmrcPath(cwd, environment);

        expect(result).toBe(npmrcPath);
        expect(mocks.mockedIsAccessibleSync).toHaveBeenCalledWith(npmrcPath);
    });

    it("should create and return a npmrc path if no other .npmrc is accessible", () => {
        expect.assertions(2);

        const environment = {};

        mocks.mockedIsAccessibleSync.mockReturnValue(false);

        const result = getNpmrcPath(cwd, environment);

        expect(result).toBe(npmrcPath);
        expect(ensureFileSync).toHaveBeenCalledWith(npmrcPath);
    });
});
