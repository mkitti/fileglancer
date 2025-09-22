import { sendFetchRequest } from '@/utils';
import { shouldTriggerHealthCheck } from '@/utils/centralServerHealth';

/**
 * Enhanced fetch request that reports failures to central server health monitoring
 */
export async function sendFetchRequestWithHealthCheck(
  apiPath: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  xrsfCookie: string,
  body?: { [key: string]: any },
  onFailure?: (apiPath: string, responseStatus?: number) => Promise<void>
): Promise<Response> {
  try {
    const response = await sendFetchRequest(apiPath, method, xrsfCookie, body);

    // Report failures if callback provided and this should trigger a health check
    if (
      !response.ok &&
      onFailure &&
      shouldTriggerHealthCheck(apiPath, response.status)
    ) {
      onFailure(apiPath, response.status);
    }

    return response;
  } catch (error) {
    // Report network failures if callback provided and this should trigger a health check
    if (onFailure && shouldTriggerHealthCheck(apiPath)) {
      onFailure(apiPath);
    }
    throw error;
  }
}

/**
 * Hook to get an enhanced fetch function that automatically reports failures
 */
export function useFetchWithHealthCheck(
  reportFailedRequest: (
    apiPath: string,
    responseStatus?: number
  ) => Promise<void>
) {
  return (
    apiPath: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    xrsfCookie: string,
    body?: { [key: string]: any }
  ) =>
    sendFetchRequestWithHealthCheck(
      apiPath,
      method,
      xrsfCookie,
      body,
      reportFailedRequest
    );
}
