import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {}
): Promise<T> {
  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    'api',
    'fileglancer',
    endPoint
  );

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }

  let data: any = await response.text();

  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.log('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return data;
}

/**
 * Make a PUT request to the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param body The body of the PUT request
 * @param init Additional initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function putAPI<T>(
  endPoint = '',
  body: any,
  init: RequestInit = {}
): Promise<T> {
  // Merge the body and method into the init object
  const requestInit: RequestInit = {
    ...init,
    method: 'PUT',
    body: JSON.stringify(body),
    headers: {
      ...init.headers,
      'Content-Type': 'application/json'
    }
  };

  return await requestAPI<T>(endPoint, requestInit);
}

/**
 * Make a DELETE request to the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Additional initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function deleteAPI<T>(
  endPoint = '',
  init: RequestInit = {}
): Promise<T> {
  // Set the method to DELETE in the init object
  const requestInit: RequestInit = {
    ...init,
    method: 'DELETE'
  };

  return await requestAPI<T>(endPoint, requestInit);
}
