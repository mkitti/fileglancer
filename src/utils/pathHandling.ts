import path from 'path';

function joinPaths(...paths: string[]): string {
  return path.posix.join(...paths.map(path => path.trim()));
}

function getFileFetchPath(
  fspName: string,
  filePath?: string,
  parentOnly?: boolean
): string {
  let fetchPath = joinPaths('/api/fileglancer/files/', fspName);

  const params: string[] = [];
  if (filePath) {
    params.push(`subpath=${encodeURIComponent(filePath)}`);
  }
  if (parentOnly) {
    params.push(`cwd_only=${parentOnly}`);
  }
  if (params.length > 0) {
    fetchPath += `?${params.join('&')}`;
  }

  return fetchPath;
}

function getLastSegmentFromPath(itemPath: string): string {
  return path.basename(itemPath);
}

function makePathSegmentArray(itemPath: string): string[] {
  return itemPath.split(path.sep);
}

function removeLastSegmentFromPath(itemPath: string): string {
  return path.dirname(itemPath);
}

function convertPathToWindowsStyle(pathString: string): string {
  // Convert POSIX-style path to Windows-style
  return pathString.replace(/\//g, '\\');
}

export {
  convertPathToWindowsStyle,
  getFileFetchPath,
  getLastSegmentFromPath,
  joinPaths,
  makePathSegmentArray,
  removeLastSegmentFromPath
};
