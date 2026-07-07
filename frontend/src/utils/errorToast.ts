import toast from 'react-hot-toast';

import logger from '@/logger';

// Longest message shown in a toast. Anything bigger (e.g. a multi-line
// manifest validation error) would overflow the screen and vanish before it
// can be read, so it is cut here and logged in full instead.
const MAX_TOAST_MESSAGE_LENGTH = 300;

/**
 * Show an error toast for an unknown error value (typically a caught fetch
 * error). Long messages are truncated to stay readable in the growler, with
 * the full text logged to the browser console.
 */
export function showErrorToast(error: unknown, fallback: string) {
  const message =
    error instanceof Error ? error.message : fallback || String(error);
  if (message.length > MAX_TOAST_MESSAGE_LENGTH) {
    logger.error(message);
    toast.error(
      `${message.slice(0, MAX_TOAST_MESSAGE_LENGTH)}… (full error logged to browser console)`
    );
  } else {
    toast.error(message);
  }
}
