import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { dirname, join } from "@visulima/path";
import Docker from "dockerode";
import getStream from "get-stream";
import { got } from "got";
import pRetry from "p-retry";

const IMAGE = "verdaccio/verdaccio:4";
const REGISTRY_PORT = 4873;
const REGISTRY_HOST = "localhost";
const NPM_USERNAME = "integration";
const NPM_PASSWORD = "suchsecure";
const NPM_EMAIL = "integration@test.com";

const docker = new Docker();

let container: Docker.Container;

/**
 * Download the `npm-registry-docker` Docker image, create a new container and start it.
 */
// eslint-disable-next-line import/no-unused-modules
export const start = async (): Promise<void> => {
    await getStream(await docker.pull(IMAGE));

    container = await docker.createContainer({
        Binds: [`${join(dirname(fileURLToPath(import.meta.url)), "config.yaml")}:/verdaccio/conf/config.yaml`],
        Image: IMAGE,
        PortBindings: { [`${REGISTRY_PORT}/tcp`]: [{ HostPort: `${REGISTRY_PORT}` }] },
        Tty: true,
    });

    await container.start();
    await setTimeout(4000);

    try {
        // Wait for the registry to be ready
        await pRetry(() => got(`http://${REGISTRY_HOST}:${REGISTRY_PORT}/`, { cache: false }), {
            factor: 2,
            minTimeout: 1000,
            retries: 7,
        });
    } catch {
        throw new Error(`Couldn't start npm-docker-couchdb after 2 min`);
    }

    // Create user
    await got(`http://${REGISTRY_HOST}:${REGISTRY_PORT}/-/user/org.couchdb.user:${NPM_USERNAME}`, {
        json: {
            _id: `org.couchdb.user:${NPM_USERNAME}`,
            email: NPM_EMAIL,
            name: NPM_USERNAME,
            password: NPM_PASSWORD,
            roles: [],
            type: "user",
        },
        method: "PUT",
    });
};

// eslint-disable-next-line import/no-unused-modules
export const url = `http://${REGISTRY_HOST}:${REGISTRY_PORT}/`;

// eslint-disable-next-line import/no-unused-modules
export const authEnvironment = {
    NPM_EMAIL,
    NPM_PASSWORD,
    NPM_USERNAME,
    npm_config_registry: url,
};

/**
 * Stop and remote the `npm-registry-docker` Docker container.
 */
// eslint-disable-next-line import/no-unused-modules
export const stop = async (): Promise<void> => {
    await container.stop();
    await container.remove();
};
