import type SemanticReleaseError from "@semantic-release/error";
import { ensureFileSync } from "@visulima/fs";
import type AggregateError from "aggregate-error";
import { beforeEach, describe, expect, it, vi } from "vitest";

import getNpmrcPath from "../../../src/utils/get-npmrc-path";

const mocks = vi.hoisted(() => {
    return {
        mockedEnsureFileSync: vi.fn(),
        mockedFindCacheDirectorySync: vi.fn(),
        mockedIsAccessibleSync: vi.fn(),
        mockedResolve: vi.fn(),
    };
});

vi.mock("@visulima/fs", () => {
    return {
        ensureFileSync: mocks.mockedEnsureFileSync,
        isAccessibleSync: mocks.mockedIsAccessibleSync,
    };
});

vi.mock("@visulima/package", () => {
    return {
        findCacheDirectorySync: mocks.mockedFindCacheDirectorySync,
    };
});

vi.mock("@visulima/path", () => {
    return {
        resolve: mocks.mockedResolve,
    };
});

describe("getNpmrcPath", () => {
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

    it("should create and return a temporary npmrc path if no other .npmrc is accessible", () => {
        expect.assertions(3);

        const environment = {};
        const temporaryNpmrcPath = "/temporary/directory/.npmrc";

        mocks.mockedIsAccessibleSync.mockReturnValue(false);
        mocks.mockedFindCacheDirectorySync.mockReturnValue(temporaryNpmrcPath);

        const result = getNpmrcPath(cwd, environment);

        expect(result).toBe(temporaryNpmrcPath);
        expect(mocks.mockedFindCacheDirectorySync).toHaveBeenCalledWith("semantic-release-pnpm", { create: true, cwd });
        expect(ensureFileSync).toHaveBeenCalledWith(temporaryNpmrcPath);
    });

    it("should throw an error if no .npmrc is found or accessible", () => {
        expect.assertions(2);

        const environment = {};

        mocks.mockedIsAccessibleSync.mockReturnValue(false);
        mocks.mockedFindCacheDirectorySync.mockReturnValue(undefined);

        try {
            getNpmrcPath(cwd, environment);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            const typedError = error as AggregateError;

            // eslint-disable-next-line vitest/no-conditional-expect
            expect((typedError.errors[0] as SemanticReleaseError).message).toBe("Missing `.npmrc` file.");
            // eslint-disable-next-line vitest/no-conditional-expect
            expect((typedError.errors[0] as SemanticReleaseError).code).toBe("ENOPNPMRC");
        }
    });
});
