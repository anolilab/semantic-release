const isWindows = process.platform === "win32";

const transformPath = (path: string): string => (isWindows ? path.replaceAll("/", "\\") : path);

export default transformPath;
