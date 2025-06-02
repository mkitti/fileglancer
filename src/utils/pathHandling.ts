function getCleanPath(path: string): string {
  if (path && path.trim() !== '') {
    // Remove leading slash from path if present to avoid double slashes
    return path.trim().startsWith('/') ? path.trim().substring(1) : path.trim();
  }
  return path;
}

function getFileFetchPath(path: string): string {
  return `/api/fileglancer/files/${getCleanPath(path)}`;
}

export { getCleanPath, getFileFetchPath };
