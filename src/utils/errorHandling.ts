import type { Success, Failure, Result } from '@/shared.types';

function createSuccess<T>(data?: T): Success<T> {
  return { success: true, data };
}

function createFailure(error: string): Failure {
  return { success: false, error };
}

function getErrorString(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
}

function handleError(error: unknown): Failure {
  logger.error(error);
  return createFailure(getErrorString(error));
}

export {
  createSuccessResult,
  createFailureResult,
  parseError,
  checkIfSuccessful
};
