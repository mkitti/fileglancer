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
  const match = window.location.pathname.match(/^\/jupyter\/user\/[^/]+\//);
  if (match) {
    return match[0];
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

export {
  formatFileSize,
  formatDate,
  getAPIPathRoot,
  sendFetchRequest,
  removeLastSegmentFromPath
};
