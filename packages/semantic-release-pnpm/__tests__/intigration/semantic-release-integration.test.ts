import { rm } from "node:fs/promises";

import { writeJson } from "@visulima/fs";
import { join } from "@visulima/path";
import { WritableStreamBuffer } from "stream-buffers";
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { start, stop, url as npmRegistryUrl } from "./helpers/npm-registry";

const logSpy = vi.fn();
const logger = { error: vi.fn(), log: logSpy, success: vi.fn() };

// @TODO: port all test and try to run them
describe("semantic-release-integration", () => {
    let cwd: string;

    beforeEach(async () => {
        cwd = temporaryDirectory();

        // Start the local NPM registry
        await start();
    });

    afterEach(async () => {
        await rm(cwd, { recursive: true });

        // Stop the local NPM registry
        await stop();
    });

    // eslint-disable-next-line vitest/no-disabled-tests
    it.skip('should skip npm auth verification if "npmPublish" is false', async () => {
        expect.assertions(1);

        await writeJson(join(cwd, "package.json"), { name: "published", publishConfig: { registry: npmRegistryUrl }, version: "1.0.0" });

        const { verifyConditions } = await import("../../src");

        await expect(
            async () =>
                await verifyConditions(
                    { npmPublish: false },
                    {
                        cwd,
                        env: { NPM_TOKEN: "wrong_token" },
                        logger,
                        options: {},
                        stderr: new WritableStreamBuffer(),
                        stdout: new WritableStreamBuffer(),
                    },
                ),
        ).rejects.not.toThrow("Invalid npm token.");
    });
});

// const path = require("node:path");
// const test = require("ava");
// const { outputJson, pathExists, readJson } = require("fs-extra");
// const execa = require("execa");
// const { spy } = require("sinon");
// const tempy = require("tempy");
// const clearModule = require("clear-module");
// const { WritableStreamBuffer } = require("stream-buffers");
// const npmRegistry = require("./helpers/npm-registry");
//
// // Environment variables used only for the local npm command used to do verification
// const testEnvironment = {
//     ...process.env,
//     ...npmRegistry.authEnv,
//     LEGACY_TOKEN: Buffer.from(`${npmRegistry.authEnv.NPM_USERNAME}:${npmRegistry.authEnv.NPM_PASSWORD}`, "utf8").toString("base64"),
//     npm_config_registry: npmRegistry.url,
// };

//
// test('Skip npm auth verification if "package.private" is true', async (t) => {
//     const cwd = tempy.directory();
//     const package_ = { name: "published", private: true, publishConfig: { registry: npmRegistry.url }, version: "1.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     await t.notThrowsAsync(
//         t.context.m.verifyConditions(
//             { npmPublish: false },
//             {
//                 cwd,
//                 env: {},
//                 logger: t.context.logger,
//                 options: { publish: ["@semantic-release/npm"] },
//                 stderr: t.context.stderr,
//                 stdout: t.context.stdout,
//             },
//         ),
//     );
// });
//
// test('Skip npm token verification if "package.private" is true', async (t) => {
//     const cwd = tempy.directory();
//     const package_ = { name: "published", private: true, publishConfig: { registry: npmRegistry.url }, version: "1.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//     await t.notThrowsAsync(
//         t.context.m.verifyConditions(
//             {},
//             {
//                 cwd,
//                 env: {},
//                 logger: t.context.logger,
//                 options: { publish: ["@semantic-release/npm"] },
//                 stderr: t.context.stderr,
//                 stdout: t.context.stdout,
//             },
//         ),
//     );
// });
//
// test("Throws error if NPM token is invalid", async (t) => {
//     const cwd = tempy.directory();
//     const environment = { DEFAULT_NPM_REGISTRY: npmRegistry.url, NPM_TOKEN: "wrong_token" };
//     const package_ = { name: "published", publishConfig: { registry: npmRegistry.url }, version: "1.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     const [error] = await t.throwsAsync(
//         t.context.m.verifyConditions({}, { cwd, env: environment, logger: t.context.logger, options: {}, stderr: t.context.stderr, stdout: t.context.stdout }),
//     );
//
//     t.is(error.name, "SemanticReleaseError");
//     t.is(error.code, "EINVALIDNPMTOKEN");
//     t.is(error.message, "Invalid npm token.");
// });
//
// test("Skip Token validation if the registry configured is not the default one", async (t) => {
//     const cwd = tempy.directory();
//     const environment = { NPM_TOKEN: "wrong_token" };
//     const package_ = { name: "published", publishConfig: { registry: "http://custom-registry.com/" }, version: "1.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//     await t.notThrowsAsync(
//         t.context.m.verifyConditions({}, { cwd, env: environment, logger: t.context.logger, options: {}, stderr: t.context.stderr, stdout: t.context.stdout }),
//     );
// });
//
// test("Verify npm auth and package", async (t) => {
//     const cwd = tempy.directory();
//     const package_ = { name: "valid-token", publishConfig: { registry: npmRegistry.url }, version: "0.0.0-dev" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//     await t.notThrowsAsync(
//         t.context.m.verifyConditions(
//             {},
//             {
//                 cwd,
//                 env: npmRegistry.authEnv,
//                 logger: t.context.logger,
//                 options: {},
//                 stderr: t.context.stderr,
//                 stdout: t.context.stdout,
//             },
//         ),
//     );
// });
//
// test("Verify npm auth and package from a sub-directory", async (t) => {
//     const cwd = tempy.directory();
//     const package_ = { name: "valid-token", publishConfig: { registry: npmRegistry.url }, version: "0.0.0-dev" };
//     await outputJson(path.resolve(cwd, "dist/package.json"), package_);
//     await t.notThrowsAsync(
//         t.context.m.verifyConditions(
//             { pkgRoot: "dist" },
//             {
//                 cwd,
//                 env: npmRegistry.authEnv,
//                 logger: t.context.logger,
//                 options: {},
//                 stderr: t.context.stderr,
//                 stdout: t.context.stdout,
//             },
//         ),
//     );
// });
//
// test('Verify npm auth and package with "npm_config_registry" env var set by yarn', async (t) => {
//     const cwd = tempy.directory();
//     const package_ = { name: "valid-token", publishConfig: { registry: npmRegistry.url }, version: "0.0.0-dev" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//     await t.notThrowsAsync(
//         t.context.m.verifyConditions(
//             {},
//             {
//                 cwd,
//                 env: { ...npmRegistry.authEnv, npm_config_registry: "https://registry.yarnpkg.com" },
//                 logger: t.context.logger,
//                 options: { publish: [] },
//                 stderr: t.context.stderr,
//                 stdout: t.context.stdout,
//             },
//         ),
//     );
// });
//
// test("Throw SemanticReleaseError Array if config option are not valid in verifyConditions", async (t) => {
//     const cwd = tempy.directory();
//     const package_ = { publishConfig: { registry: npmRegistry.url } };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//     const npmPublish = 42;
//     const tarballDir = 42;
//     const packageRoot = 42;
//     const errors = [
//         ...(await t.throwsAsync(
//             t.context.m.verifyConditions(
//                 {},
//                 {
//                     cwd,
//                     env: {},
//                     logger: t.context.logger,
//                     options: {
//                         publish: ["@semantic-release/github", { npmPublish, path: "@semantic-release/npm", pkgRoot: packageRoot, tarballDir }],
//                     },
//                     stderr: t.context.stderr,
//                     stdout: t.context.stdout,
//                 },
//             ),
//         )),
//     ];
//
//     t.is(errors[0].name, "SemanticReleaseError");
//     t.is(errors[0].code, "EINVALIDNPMPUBLISH");
//     t.is(errors[1].name, "SemanticReleaseError");
//     t.is(errors[1].code, "EINVALIDTARBALLDIR");
//     t.is(errors[2].name, "SemanticReleaseError");
//     t.is(errors[2].code, "EINVALIDPKGROOT");
//     t.is(errors[3].name, "SemanticReleaseError");
//     t.is(errors[3].code, "ENOPKG");
// });
//
// test("Publish the package", async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { name: "publish", publishConfig: { registry: npmRegistry.url }, version: "0.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     const result = await t.context.m.publish(
//         {},
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.deepEqual(result, { channel: "latest", name: "npm package (@latest dist-tag)", url: undefined });
//     t.is((await readJson(path.resolve(cwd, "package.json"))).version, "1.0.0");
//     t.false(await pathExists(path.resolve(cwd, `${package_.name}-1.0.0.tgz`)));
//     t.is((await execa("npm", ["view", package_.name, "version"], { cwd, env: testEnvironment })).stdout, "1.0.0");
// });
//
// test("Publish the package on a dist-tag", async (t) => {
//     const cwd = tempy.directory();
//     const environment = { ...npmRegistry.authEnv, DEFAULT_NPM_REGISTRY: npmRegistry.url };
//     const package_ = { name: "publish-tag", publishConfig: { registry: npmRegistry.url, tag: "next" }, version: "0.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     const result = await t.context.m.publish(
//         {},
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { channel: "next", version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.deepEqual(result, {
//         channel: "next",
//         name: "npm package (@next dist-tag)",
//         url: "https://www.npmjs.com/package/publish-tag/v/1.0.0",
//     });
//     t.is((await readJson(path.resolve(cwd, "package.json"))).version, "1.0.0");
//     t.false(await pathExists(path.resolve(cwd, `${package_.name}-1.0.0.tgz`)));
//     t.is((await execa("npm", ["view", package_.name, "version"], { cwd, env: testEnvironment })).stdout, "1.0.0");
// });
//
// test("Publish the package from a sub-directory", async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { name: "publish-sub-dir", publishConfig: { registry: npmRegistry.url }, version: "0.0.0" };
//     await outputJson(path.resolve(cwd, "dist/package.json"), package_);
//
//     const result = await t.context.m.publish(
//         { pkgRoot: "dist" },
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.deepEqual(result, { channel: "latest", name: "npm package (@latest dist-tag)", url: undefined });
//     t.is((await readJson(path.resolve(cwd, "dist/package.json"))).version, "1.0.0");
//     t.false(await pathExists(path.resolve(cwd, `${package_.name}-1.0.0.tgz`)));
//     t.is((await execa("npm", ["view", package_.name, "version"], { cwd, env: testEnvironment })).stdout, "1.0.0");
// });
//
// test('Create the package and skip publish ("npmPublish" is false)', async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { name: "skip-publish", publishConfig: { registry: npmRegistry.url }, version: "0.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     const result = await t.context.m.publish(
//         { npmPublish: false, tarballDir: "tarball" },
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.false(result);
//     t.is((await readJson(path.resolve(cwd, "package.json"))).version, "1.0.0");
//     t.true(await pathExists(path.resolve(cwd, `tarball/${package_.name}-1.0.0.tgz`)));
//     await t.throwsAsync(execa("npm", ["view", package_.name, "version"], { cwd, env: testEnvironment }));
// });
//
// test('Create the package and skip publish ("package.private" is true)', async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = {
//         name: "skip-publish-private",
//         private: true,
//         publishConfig: { registry: npmRegistry.url },
//         version: "0.0.0",
//     };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     const result = await t.context.m.publish(
//         { tarballDir: "tarball" },
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.false(result);
//     t.is((await readJson(path.resolve(cwd, "package.json"))).version, "1.0.0");
//     t.true(await pathExists(path.resolve(cwd, `tarball/${package_.name}-1.0.0.tgz`)));
//     await t.throwsAsync(execa("npm", ["view", package_.name, "version"], { cwd, env: testEnvironment }));
// });
//
// test('Create the package and skip publish from a sub-directory ("npmPublish" is false)', async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { name: "skip-publish-sub-dir", publishConfig: { registry: npmRegistry.url }, version: "0.0.0" };
//     await outputJson(path.resolve(cwd, "dist/package.json"), package_);
//
//     const result = await t.context.m.publish(
//         { npmPublish: false, pkgRoot: "./dist", tarballDir: "./tarball" },
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.false(result);
//     t.is((await readJson(path.resolve(cwd, "dist/package.json"))).version, "1.0.0");
//     t.true(await pathExists(path.resolve(cwd, `tarball/${package_.name}-1.0.0.tgz`)));
//     await t.throwsAsync(execa("npm", ["view", package_.name, "version"], { cwd, env: testEnvironment }));
// });
//
// test('Create the package and skip publish from a sub-directory ("package.private" is true)', async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = {
//         name: "skip-publish-sub-dir-private",
//         private: true,
//         publishConfig: { registry: npmRegistry.url },
//         version: "0.0.0",
//     };
//     await outputJson(path.resolve(cwd, "dist/package.json"), package_);
//
//     const result = await t.context.m.publish(
//         { pkgRoot: "./dist", tarballDir: "./tarball" },
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.false(result);
//     t.is((await readJson(path.resolve(cwd, "dist/package.json"))).version, "1.0.0");
//     t.true(await pathExists(path.resolve(cwd, `tarball/${package_.name}-1.0.0.tgz`)));
//     await t.throwsAsync(execa("npm", ["view", package_.name, "version"], { cwd, env: testEnvironment }));
// });
//
// test("Throw SemanticReleaseError Array if config option are not valid in publish", async (t) => {
//     const cwd = tempy.directory();
//     const package_ = { publishConfig: { registry: npmRegistry.url } };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//     const npmPublish = 42;
//     const tarballDir = 42;
//     const packageRoot = 42;
//
//     const errors = [
//         ...(await t.throwsAsync(
//             t.context.m.publish(
//                 { npmPublish, pkgRoot: packageRoot, tarballDir },
//                 {
//                     cwd,
//                     env: {},
//                     logger: t.context.logger,
//                     nextRelease: { version: "1.0.0" },
//                     options: { publish: ["@semantic-release/github", "@semantic-release/npm"] },
//                     stderr: t.context.stderr,
//                     stdout: t.context.stdout,
//                 },
//             ),
//         )),
//     ];
//
//     t.is(errors[0].name, "SemanticReleaseError");
//     t.is(errors[0].code, "EINVALIDNPMPUBLISH");
//     t.is(errors[1].name, "SemanticReleaseError");
//     t.is(errors[1].code, "EINVALIDTARBALLDIR");
//     t.is(errors[2].name, "SemanticReleaseError");
//     t.is(errors[2].code, "EINVALIDPKGROOT");
//     t.is(errors[3].name, "SemanticReleaseError");
//     t.is(errors[3].code, "ENOPKG");
// });
//
// test("Prepare the package", async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { name: "prepare", publishConfig: { registry: npmRegistry.url }, version: "0.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     await t.context.m.prepare(
//         {},
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.is((await readJson(path.resolve(cwd, "package.json"))).version, "1.0.0");
//     t.false(await pathExists(path.resolve(cwd, `${package_.name}-1.0.0.tgz`)));
// });
//
// test("Prepare the package from a sub-directory", async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { name: "prepare-sub-dir", publishConfig: { registry: npmRegistry.url }, version: "0.0.0" };
//     await outputJson(path.resolve(cwd, "dist/package.json"), package_);
//
//     await t.context.m.prepare(
//         { pkgRoot: "dist" },
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.is((await readJson(path.resolve(cwd, "dist/package.json"))).version, "1.0.0");
//     t.false(await pathExists(path.resolve(cwd, `${package_.name}-1.0.0.tgz`)));
// });
//
// test("Throw SemanticReleaseError Array if config option are not valid in prepare", async (t) => {
//     const cwd = tempy.directory();
//     const package_ = { publishConfig: { registry: npmRegistry.url } };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//     const npmPublish = 42;
//     const tarballDir = 42;
//     const packageRoot = 42;
//
//     const errors = [
//         ...(await t.throwsAsync(
//             t.context.m.prepare(
//                 { npmPublish, pkgRoot: packageRoot, tarballDir },
//                 {
//                     cwd,
//                     env: {},
//                     logger: t.context.logger,
//                     nextRelease: { version: "1.0.0" },
//                     options: { publish: ["@semantic-release/github", "@semantic-release/npm"] },
//                     stderr: t.context.stderr,
//                     stdout: t.context.stdout,
//                 },
//             ),
//         )),
//     ];
//
//     t.is(errors[0].name, "SemanticReleaseError");
//     t.is(errors[0].code, "EINVALIDNPMPUBLISH");
//     t.is(errors[1].name, "SemanticReleaseError");
//     t.is(errors[1].code, "EINVALIDTARBALLDIR");
//     t.is(errors[2].name, "SemanticReleaseError");
//     t.is(errors[2].code, "EINVALIDPKGROOT");
//     t.is(errors[3].name, "SemanticReleaseError");
//     t.is(errors[3].code, "ENOPKG");
// });
//
// test("Publish the package and add to default dist-tag", async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { name: "add-channel", publishConfig: { registry: npmRegistry.url }, version: "0.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     await t.context.m.publish(
//         {},
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { channel: "next", version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     const result = await t.context.m.addChannel(
//         {},
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.deepEqual(result, { channel: "latest", name: "npm package (@latest dist-tag)", url: undefined });
//     t.is((await execa("npm", ["view", package_.name, "dist-tags.latest"], { cwd, env: environment })).stdout, "1.0.0");
// });
//
// test("Publish the package and add to lts dist-tag", async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { name: "add-channel-legacy", publishConfig: { registry: npmRegistry.url }, version: "1.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     await t.context.m.publish(
//         {},
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { channel: "latest", version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     const result = await t.context.m.addChannel(
//         {},
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { channel: "1.x", version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.deepEqual(result, { channel: "release-1.x", name: "npm package (@release-1.x dist-tag)", url: undefined });
//     t.is((await execa("npm", ["view", package_.name, "dist-tags"], { cwd, env: environment })).stdout, "{ latest: '1.0.0', 'release-1.x': '1.0.0' }");
// });
//
// test('Skip adding the package to a channel ("npmPublish" is false)', async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { name: "skip-add-channel", publishConfig: { registry: npmRegistry.url }, version: "0.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     const result = await t.context.m.addChannel(
//         { npmPublish: false },
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.false(result);
//     await t.throwsAsync(execa("npm", ["view", package_.name, "version"], { cwd, env: environment }));
// });
//
// test('Skip adding the package to a channel ("package.private" is true)', async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = {
//         name: "skip-add-channel-private",
//         private: true,
//         publishConfig: { registry: npmRegistry.url },
//         version: "0.0.0",
//     };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     const result = await t.context.m.addChannel(
//         {},
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.false(result);
//     await t.throwsAsync(execa("npm", ["view", package_.name, "version"], { cwd, env: environment }));
// });
//
// test("Create the package in addChannel step", async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { name: "add-channel-pkg", publishConfig: { registry: npmRegistry.url }, version: "0.0.0" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     await t.context.m.prepare(
//         { npmPublish: false, tarballDir: "tarball" },
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.is((await readJson(path.resolve(cwd, "package.json"))).version, "1.0.0");
//     t.true(await pathExists(path.resolve(cwd, `tarball/${package_.name}-1.0.0.tgz`)));
// });
//
// test("Throw SemanticReleaseError Array if config option are not valid in addChannel", async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { publishConfig: { registry: npmRegistry.url } };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//     const npmPublish = 42;
//     const tarballDir = 42;
//     const packageRoot = 42;
//
//     const errors = [
//         ...(await t.throwsAsync(
//             t.context.m.addChannel(
//                 { npmPublish, pkgRoot: packageRoot, tarballDir },
//                 {
//                     cwd,
//                     env: environment,
//                     logger: t.context.logger,
//                     nextRelease: { version: "1.0.0" },
//                     options: { publish: ["@semantic-release/github", "@semantic-release/npm"] },
//                     stderr: t.context.stderr,
//                     stdout: t.context.stdout,
//                 },
//             ),
//         )),
//     ];
//
//     t.is(errors[0].name, "SemanticReleaseError");
//     t.is(errors[0].code, "EINVALIDNPMPUBLISH");
//     t.is(errors[1].name, "SemanticReleaseError");
//     t.is(errors[1].code, "EINVALIDTARBALLDIR");
//     t.is(errors[2].name, "SemanticReleaseError");
//     t.is(errors[2].code, "EINVALIDPKGROOT");
//     t.is(errors[3].name, "SemanticReleaseError");
//     t.is(errors[3].code, "ENOPKG");
// });
//
// test("Verify token and set up auth only on the fist call, then prepare on prepare call only", async (t) => {
//     const cwd = tempy.directory();
//     const environment = npmRegistry.authEnv;
//     const package_ = { name: "test-module", publishConfig: { registry: npmRegistry.url }, version: "0.0.0-dev" };
//     await outputJson(path.resolve(cwd, "package.json"), package_);
//
//     await t.notThrowsAsync(
//         t.context.m.verifyConditions({}, { cwd, env: environment, logger: t.context.logger, options: {}, stderr: t.context.stderr, stdout: t.context.stdout }),
//     );
//     await t.context.m.prepare(
//         {},
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     let result = await t.context.m.publish(
//         {},
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { channel: "next", version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//     t.deepEqual(result, { channel: "next", name: "npm package (@next dist-tag)", url: undefined });
//     t.is((await execa("npm", ["view", package_.name, "dist-tags.next"], { cwd, env: environment })).stdout, "1.0.0");
//
//     result = await t.context.m.addChannel(
//         {},
//         {
//             cwd,
//             env: environment,
//             logger: t.context.logger,
//             nextRelease: { version: "1.0.0" },
//             options: {},
//             stderr: t.context.stderr,
//             stdout: t.context.stdout,
//         },
//     );
//
//     t.deepEqual(result, { channel: "latest", name: "npm package (@latest dist-tag)", url: undefined });
//     t.is((await execa("npm", ["view", package_.name, "dist-tags.latest"], { cwd, env: environment })).stdout, "1.0.0");
// });
