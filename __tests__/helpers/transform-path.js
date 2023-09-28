const isWindows = process.platform === "win32";

const transformPath = (path) => (isWindows ? path.replaceAll("/", "\\") : path);

export default transformPath;
