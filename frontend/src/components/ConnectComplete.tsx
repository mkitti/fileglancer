import { useEffect, useMemo, useState } from 'react';

import { useAuthContext } from '@/contexts/AuthContext';
import { useAllowedOriginsQuery } from '@/queries/authQueries';
import logger from '@/logger';

const CONNECT_MESSAGE_TYPE = 'fileglancer:connected';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

/**
 * Bare page that completes the "connect to Fileglancer" handshake for an
 * external app. The app loads this page with an `origin` query param, either in
 * a popup window or a hidden iframe (`silent=1`), and listens for a postMessage
 * back.
 *
 * - Authenticated: posts `{ authenticated: true, username }` to the app's
 *   origin, then closes itself if it is a popup.
 * - Not authenticated, popup: forwards to the normal login flow (Okta or
 *   simple) with `next` set back here, so login happens in the popup.
 * - Not authenticated, silent iframe: posts `{ authenticated: false }` so the
 *   SDK knows to escalate to a visible popup (login can't run inside an iframe).
 *
 * The target window is `window.opener` for a popup or `window.parent` for an
 * iframe. Messages are only ever posted to an origin on the server's allowlist.
 */
export default function ConnectComplete() {
  const { loading, authStatus } = useAuthContext();
  const { data: allowedOrigins, isLoading: originsLoading } =
    useAllowedOriginsQuery();
  const [status, setStatus] = useState<
    'working' | 'done' | 'forbidden' | 'no-target'
  >('working');

  const { requestOrigin, silent } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('origin');
    return {
      requestOrigin: raw ? normalizeOrigin(raw) : null,
      silent: params.get('silent') === '1'
    };
  }, []);

  const originAllowed = useMemo(() => {
    if (!requestOrigin || !allowedOrigins) {
      return false;
    }
    // Same-origin (the Fileglancer UI opening its own popup) is always fine.
    if (requestOrigin === normalizeOrigin(window.location.origin)) {
      return true;
    }
    return allowedOrigins.origins.map(normalizeOrigin).includes(requestOrigin);
  }, [requestOrigin, allowedOrigins]);

  useEffect(() => {
    if (loading || originsLoading) {
      return;
    }

    if (!requestOrigin || !originAllowed) {
      logger.warn(
        `Connect request from disallowed or missing origin: ${requestOrigin}`
      );
      setStatus('forbidden');
      return;
    }

    const target: Window | null =
      window.opener || (window.parent !== window ? window.parent : null);

    if (!authStatus?.authenticated) {
      if (silent) {
        // Can't run the login flow inside an iframe — tell the SDK to escalate.
        target?.postMessage(
          { type: CONNECT_MESSAGE_TYPE, authenticated: false },
          requestOrigin
        );
        setStatus('working');
        return;
      }
      // Popup: send the user through the normal login flow, returning here.
      const self = `/connect-complete?origin=${encodeURIComponent(requestOrigin)}`;
      window.location.href = `/login?next=${encodeURIComponent(self)}`;
      return;
    }

    if (!target) {
      setStatus('no-target');
      return;
    }

    target.postMessage(
      {
        type: CONNECT_MESSAGE_TYPE,
        authenticated: true,
        username: authStatus.username
      },
      requestOrigin
    );
    setStatus('done');
    // Only a popup can (and should) close itself; the parent removes iframes.
    if (window.opener) {
      window.close();
    }
  }, [
    loading,
    originsLoading,
    requestOrigin,
    originAllowed,
    silent,
    authStatus
  ]);

  let message: string;
  if (status === 'forbidden') {
    message =
      'This application is not authorized to connect to Fileglancer. Contact your administrator.';
  } else if (status === 'done' || status === 'no-target') {
    message = 'Connected. You can close this window and return to the app.';
  } else {
    message = 'Connecting to Fileglancer…';
  }

  return (
    <div className="flex h-screen items-center justify-center p-8">
      <div className="text-foreground text-center">{message}</div>
    </div>
  );
}
