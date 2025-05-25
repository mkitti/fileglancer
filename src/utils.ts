const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} bytes`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(0)} KB`;
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(0)} MB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(0)} GB`;
  }
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

function getAPIPathRoot() {
  const path = window.location.pathname;
  const patterns = [
    /^\/jupyter\/user\/[^/]+\//, // JupyterLab
    /^\/user\/[^/]+\// // Jupyter Single User
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return '/';
}

async function sendFetchRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  xrsfCookie: string,
  body?: { [key: string]: any }
): Promise<Response> {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'X-Xsrftoken': xrsfCookie,
      ...(method !== 'GET' &&
        method !== 'DELETE' && { 'Content-Type': 'application/json' })
    },
    ...(method !== 'GET' &&
      method !== 'DELETE' &&
      body && { body: JSON.stringify(body) })
  };
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }
  return response;
}

function removeLastSegmentFromPath(path: string): string {
  const segments = path.split('/');
  if (segments.length > 1) {
    return segments.slice(0, -1).join('/');
  } else {
    return '';
  }
}

// Parse the Unix-style permissions string (e.g., "drwxr-xr-x")
const parsePermissions = (permissionString: string) => {
  // Owner permissions (positions 1-3)
  const ownerRead = permissionString[1] === 'r';
  const ownerWrite = permissionString[2] === 'w';

  // Group permissions (positions 4-6)
  const groupRead = permissionString[4] === 'r';
  const groupWrite = permissionString[5] === 'w';

  // Others/everyone permissions (positions 7-9)
  const othersRead = permissionString[7] === 'r';
  const othersWrite = permissionString[8] === 'w';

  return {
    owner: { read: ownerRead, write: ownerWrite },
    group: { read: groupRead, write: groupWrite },
    others: { read: othersRead, write: othersWrite }
  };
};

function makeMapKey(type: string, name: string): string {
  return `${type}_${name}`;
}

function getCleanPath(path: string): string {
  if (path && path.trim() !== '') {
    // Remove leading slash from path if present to avoid double slashes
    return path.trim().startsWith('/') ? path.trim().substring(1) : path.trim();
  }
  return path;
}

function getFileFetchPath(path: string): string {
  return `${getAPIPathRoot()}api/fileglancer/files/${getCleanPath(path)}`;
}

async function fetchFileContent(path: string, cookies: Record<string, string>): Promise<Uint8Array> {
  const url = getFileFetchPath(path);
  const response = await sendFetchRequest(url, 'GET', cookies._xsrf);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  const fileBuffer = await response.arrayBuffer();
  return new Uint8Array(fileBuffer);
}

async function fetchFileAsText(path: string, cookies: Record<string, string>): Promise<string> {
  const fileContent = await fetchFileContent(path, cookies);
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(fileContent);
}

async function fetchFileAsJson(path: string, cookies: Record<string, string>): Promise<object> {
  const fileText = await fetchFileAsText(path, cookies);
  return JSON.parse(fileText);
}

export {
  formatFileSize,
  formatDate,
  getAPIPathRoot,
  sendFetchRequest,
  makeMapKey,
  removeLastSegmentFromPath,
  parsePermissions,
  getCleanPath,
  getFileFetchPath,
  fetchFileContent,
  fetchFileAsText,
  fetchFileAsJson
};
