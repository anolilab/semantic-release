const isWindows = process.platform === "win32";

const transformPath = (path: string): string => {
    if (isWindows) {
        return path.replaceAll("/", "\\");
    }

    return path;
};

export default transformPath;
