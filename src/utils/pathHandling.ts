import path from 'path';
import log from 'loglevel';
import type { FileSharePath } from '@/shared.types';
import type { ProxiedPath } from '@/contexts/ProxiedPathContext';
import { getFullPath } from '@/utils';

const PATH_DELIMITER = '/';
const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;
if (!PROXY_BASE_URL) {
  log.warn('VITE_PROXY_BASE_URL is not defined in the environment.');
}

/**
 * Joins multiple path segments into a single POSIX-style path, trimming any whitespace first.
 * This is useful for constructing API endpoints or file paths.
 * Example:
 * joinPaths('/api', 'fileglancer', 'files'); // Returns '/api/fileglancer/files'
 */
function joinPaths(...paths: string[]): string {
  console.log('joining paths', paths);
  return path.posix.join(...paths.map(path => path?.trim() ?? ''));
}

/**
 * Constructs a URL for the UI to fetch folder and/or file information from the Fileglancer API.
 * If no filePath is provided, it returns the endpoint URL with the FSP path appended - this is the base URL.
 * If filePath is provided, it appends it as a URL param with key "subpath" to the base URL.
 * Example:
 * getFileBrowsePath('myFSP'); // Returns '/api/fileglancer/files/myFSP'
 * getFileBrowsePath('myFSP', 'path/to/folder'); // Returns '/api/fileglancer/files/myFSP?subpath=path%2Fto%2Ffolder'
 */
function getFileBrowsePath(fspName: string, filePath?: string): string {
  let fetchPath = joinPaths('/api/fileglancer/files/', fspName);

  const params: string[] = [];
  if (filePath) {
    params.push(`subpath=${encodeURIComponent(filePath)}`);
  }
  if (params.length > 0) {
    fetchPath += `?${params.join('&')}`;
  }

  return fetchPath;
}

/**
 * Constructs a URL for the UI to fetch file contents from the Fileglancer API.
 * If no filePath is provided, it returns the endpoint URL with the FSP path appended - this is the base URL.
 * If filePath is provided, it appends it as a URL param with key "subpath" to the base URL.
 * Example:
 * getFileContentPath('myFSP'); // Returns '/api/fileglancer/content/myFSP'
 * getFileContentPath('myFSP', 'path/to/file.txt'); // Returns '/api/fileglancer/content/myFSP?subpath=path%2Fto%2Ffile.txt'
 */
function getFileContentPath(fspName: string, filePath: string): string {
  let fetchPath = joinPaths('/api/fileglancer/content/', fspName);

  if (filePath) {
    fetchPath += `?subpath=${encodeURIComponent(filePath)}`;
  }

  return fetchPath;
}

/**
 * Constructs a sharable URL to access file contents from the browser with the Fileglancer API.
 * If no filePath is provided, it returns the endpoint URL with the FSP path appended - this is the base URL.
 * If filePath is provided, this is appended to the base URL.
 * Example:
 * getFileURL('myFSP'); // Returns 'http://localhost:8888/api/fileglancer/content/myFSP'
 * getFileURL('myFSP', 'path/to/file.txt'); // Returns 'http://localhost:8888/api/fileglancer/content/myFSP/path/to/file.txt'
 */
function getFileURL(fspName: string, filePath?: string): string {
  const fspPath = joinPaths('/api/fileglancer/content/', fspName);
  const apiPath = getFullPath(fspPath);
  const apiFilePath = filePath ? joinPaths(apiPath, filePath) : apiPath;
  return joinPaths(
    window.location.origin,
    apiFilePath
  );
}

/**
 * Extracts the last segment of a path string.
 * For example, as used in the Folder UI component:
 * getLastSegmentFromPath('/path/to/folder'); // Returns 'folder'
 */
function getLastSegmentFromPath(itemPath: string): string {
  return path.basename(itemPath);
}

/**
 * Converts a path string to an array of path segments, splitting at PATH_DELIMITER.
 * For example, as used in the Crumbs UI component:
 * makePathSegmentArray('/path/to/folder'); // Returns ['path', 'to', 'folder']
 */
function makePathSegmentArray(itemPath: string): string[] {
  return itemPath.split(PATH_DELIMITER);
}

/**
 * Removes the last segment from a path string.
 * This is useful for navigating up one level in a file path.
 * For example:
 * removeLastSegmentFromPath('/path/to/folder'); // Returns '/path/to'
 */
function removeLastSegmentFromPath(itemPath: string): string {
  return path.dirname(itemPath);
}

/**
 * Converts a POSIX-style path string to a Windows-style path string.
 * Should only be used in getPrefferedPathForDisplay function.
 * For example:
 * convertPathToWindowsStyle('/path/to/folder'); // Returns '\path\to\folder'
 */
function convertPathToWindowsStyle(pathString: string): string {
  return pathString.replace(/\//g, '\\');
}

/**
 * Returns the preferred path for display (POSIX or Windows) based on the provided path preference.
 * If no preference is provided, defaults to 'linux_path'.
 * If fsp is null, returns an empty string.
 * If subPath is provided, appends it to the base path.
 * Converts the path to Windows style if 'windows_path' is selected.
 */
function getPreferredPathForDisplay(
  pathPreference: ['linux_path' | 'windows_path' | 'mac_path'] = ['linux_path'],
  fsp: FileSharePath | null = null,
  subPath?: string
): string {
  const pathKey = pathPreference[0] ?? 'linux_path';
  const basePath = fsp ? (fsp[pathKey] ?? fsp.linux_path) : '';

  let fullPath = subPath ? joinPaths(basePath, subPath) : basePath;

  if (pathKey === 'windows_path') {
    fullPath = convertPathToWindowsStyle(fullPath);
  }

  return fullPath;
}

/**
 * Constructs a shareable URL for a proxied path item.
 * Example:
 * makeProxiedPathUrl({ sharing_key: 'key123', sharing_name: 'shared-folder' });
 * // Returns 'http://localhost:8888/proxy/key123/shared-folder'
 */
function makeProxiedPathUrl(item: ProxiedPath): string {
  return joinPaths(PROXY_BASE_URL, item.sharing_key, item.sharing_name);
}

export {
  getFileBrowsePath,
  getFileContentPath,
  getFileURL,
  getLastSegmentFromPath,
  getPreferredPathForDisplay,
  joinPaths,
  makePathSegmentArray,
  makeProxiedPathUrl,
  removeLastSegmentFromPath
};
