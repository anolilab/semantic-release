export interface PluginConfig {
    branches?: (string | { name: string; prerelease: boolean })[];
    disableScripts?: boolean;
    npmPublish?: boolean;
    pkgRoot?: string;
    publishBranch?: string;
    tarballDir?: string;
}
