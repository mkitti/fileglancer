import type { Success, Failure, Result } from '@/shared.types';

function createSuccessResult<T>(data?: T): Success<T> {
  return { success: true, data };
}

function createFailureResult(error: string): Failure {
  return { success: false, error };
}

function parseError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An error occurred';
}

function checkIfSuccessful<T>(result: Result<T>) {
  return result.success;
}

export {
  createSuccessResult,
  createFailureResult,
  parseError,
  checkIfSuccessful
};
