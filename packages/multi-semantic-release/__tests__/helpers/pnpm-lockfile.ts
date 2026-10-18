interface LockfileVersions {
    dep?: string;
    libdep?: string;
    sub?: string;
    subIntegrity?: string;
    tool?: string;
}

type ResolvedVersions = Required<LockfileVersions>;

const DEFAULT_VERSIONS: ResolvedVersions = { dep: "1.0.0", libdep: "2.0.0", sub: "3.0.0", subIntegrity: "sha512-sub", tool: "1.0.0" };

const buildImporters = ({ dep: dependency, libdep, tool }: ResolvedVersions): string => `importers:

  .: {}

  packages/a:
    dependencies:
      dep:
        specifier: ^1.0.0
        version: ${dependency}
      lib:
        specifier: workspace:^
        version: link:../lib
    devDependencies:
      tool:
        specifier: ^1.0.0
        version: ${tool}

  packages/b:
    dependencies:
      other:
        specifier: ^1.0.0
        version: 1.0.0

  packages/lib:
    dependencies:
      libdep:
        specifier: ^2.0.0
        version: ${libdep}
`;

const buildPackages = ({ dep: dependency, libdep, sub, subIntegrity, tool }: ResolvedVersions): string => `packages:

  dep@${dependency}:
    resolution: {integrity: sha512-dep}

  libdep@${libdep}:
    resolution: {integrity: sha512-libdep}

  other@1.0.0:
    resolution: {integrity: sha512-other}

  sub@${sub}:
    resolution: {integrity: ${subIntegrity}}

  tool@${tool}:
    resolution: {integrity: sha512-tool}
`;

const buildSnapshots = ({ dep: dependency, libdep, sub, tool }: ResolvedVersions): string => `snapshots:

  dep@${dependency}:
    dependencies:
      sub: ${sub}

  libdep@${libdep}: {}

  other@1.0.0: {}

  sub@${sub}: {}

  tool@${tool}: {}
`;

/**
 * Build a pnpm v9 lock file: packages/a depends on dep (→ sub), links packages/lib (→ libdep)
 * and has tool as devDependency; packages/b depends on other.
 * @param versions The versions to resolve.
 * @returns The lock file content.
 */
const buildPnpmLockfile = (versions: LockfileVersions = {}): string => {
    const resolved = { ...DEFAULT_VERSIONS, ...versions };

    return `lockfileVersion: '9.0'

${buildImporters(resolved)}
${buildPackages(resolved)}
${buildSnapshots(resolved)}`;
};

export type { LockfileVersions };
export { buildPnpmLockfile };
