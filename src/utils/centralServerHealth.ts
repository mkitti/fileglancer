import { sendFetchRequest } from '@/utils';
import { getErrorString } from '@/utils/errorHandling';
import logger from '@/logger';

export type CentralServerStatus = 'healthy' | 'down' | 'checking';

/**
 * Check if the central server is healthy by hitting the version endpoint
 * This is a stable endpoint that should always return 200 when the central server is working
 */
export async function checkCentralServerHealth(
  xsrfToken: string
): Promise<CentralServerStatus> {
  try {
    const response = await sendFetchRequest(
      '/api/fileglancer/central-version',
      'GET',
      xsrfToken
    );

    // If we get a successful response (including not-configured), central server connection is working
    if (response.ok) {
      return 'healthy';
    }

    // If we get a 500 with "Central server not configured", that's still "healthy" from a connectivity perspective
    if (response.status === 500) {
      try {
        const errorData = await response.json();
        if (errorData.error?.includes('Central server not configured')) {
          return 'healthy'; // Configuration issue, not connectivity issue
        }
      } catch {
        // Failed to parse error response, continue to treat as down
      }
    }

    // Any other error suggests the central server is down
    logger.warn(
      `Central server health check failed: ${response.status} ${response.statusText}`
    );
    return 'down';
  } catch (error) {
    logger.warn(`Central server health check error: ${getErrorString(error)}`);
    return 'down';
  }
}

/**
 * Determines if a failed request to the central server should trigger a health check
 * Only check for requests that would normally succeed if the central server is running
 */
export function shouldTriggerHealthCheck(
  apiPath: string,
  responseStatus?: number
): boolean {
  // Skip health check for the health check endpoint itself to avoid infinite loops
  if (apiPath.includes('/central-version')) {
    logger.debug(
      `Health check skipped for central-version endpoint: ${apiPath}`
    );
    return false;
  }

  // Skip health check for local/non-central server endpoints
  const localEndpoints = [
    '/api/fileglancer/profile', // User profile is local
    '/api/fileglancer/version', // Local server version
    '/api/fileglancer/files', // File system access
    '/api/fileglancer/content' // File content access
  ];

  const isLocalEndpoint = localEndpoints.some(endpoint =>
    apiPath.includes(endpoint)
  );

  if (isLocalEndpoint) {
    logger.debug(`Health check skipped for local endpoint: ${apiPath}`);
    return false;
  }

  // Only trigger health check for central server related endpoints
  const centralServerEndpoints = [
    '/api/fileglancer/notifications',
    '/api/fileglancer/proxied-path',
    '/api/fileglancer/file-share-paths',
    '/api/fileglancer/external-buckets',
    '/api/fileglancer/preference' // Preferences are stored on central server when configured
  ];

  const isCentralServerEndpoint = centralServerEndpoints.some(endpoint =>
    apiPath.includes(endpoint)
  );

  if (!isCentralServerEndpoint) {
    logger.debug(
      `Health check skipped for non-central server endpoint: ${apiPath}`
    );
    return false;
  }

  // Trigger health check for network errors or server errors
  // Don't trigger for client errors like 404, 400, etc. as those are expected
  if (!responseStatus) {
    logger.info(
      `Health check triggered for network error on central server endpoint: ${apiPath}`
    );
    return true; // Network error (fetch failed)
  }

  const shouldTrigger = responseStatus >= 500;
  if (shouldTrigger) {
    logger.info(
      `Health check triggered for server error ${responseStatus} on central server endpoint: ${apiPath}`
    );
  } else {
    logger.debug(
      `Health check skipped for client error ${responseStatus} on central server endpoint: ${apiPath}`
    );
  }

  return shouldTrigger; // Server errors only
}
