import logger from '@/logger';
import type { Success, Failure} from '@/shared.types';

function createSuccess<T>(data?: T): Success<T> {
  return { success: true, data };
}

async function getResponseError(response: Response): Promise<string> {
  const body = await response.json();
  return `${response.status}: ${body.error ? body.error : 'Unknown error'}`;
}

function createFailure(error: string): Failure {
  return { success: false, error };
}

async function getErrorString(error: unknown): Promise<string> {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }
  if (error instanceof Response){
    return await getResponseError(error)
  }
  return 'An unknown error occurred';
}

async function handleError(error: unknown): Promise<Failure> {
  const errorString = await getErrorString(error)
  logger.error(errorString);
  return createFailure(errorString);
}

export { createSuccess, handleError, getResponseError };
