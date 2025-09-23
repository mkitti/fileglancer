import React from 'react';
import { useCookiesContext } from '@/contexts/CookiesContext';
import {
  checkCentralServerHealth,
  CentralServerStatus,
  shouldTriggerHealthCheck
} from '@/utils/centralServerHealth';
import { setHealthCheckReporter, clearHealthCheckReporter } from '@/utils';
import logger from '@/logger';

type CentralServerHealthContextType = {
  status: CentralServerStatus;
  checkHealth: () => Promise<void>;
  reportFailedRequest: (
    apiPath: string,
    responseStatus?: number
  ) => Promise<void>;
  dismissWarning: () => void;
  showWarningOverlay: boolean;
  nextRetrySeconds: number | null;
};

const CentralServerHealthContext =
  React.createContext<CentralServerHealthContextType | null>(null);

// Health check retry configuration constants
const MAX_RETRY_ATTEMPTS = 100; // Limit total retry attempts to prevent infinite loops
const RETRY_BASE_DELAY_MS = 6000; // Start with 6 seconds
const RETRY_MAX_DELAY_MS = 300000; // Cap at 5 minutes
const HEALTH_CHECK_DEBOUNCE_MS = 1000; // Wait 1 second before checking
const MS_PER_SECOND = 1000; // Milliseconds to seconds conversion

export const useCentralServerHealthContext = () => {
  const context = React.useContext(CentralServerHealthContext);
  if (!context) {
    throw new Error(
      'useCentralServerHealthContext must be used within a CentralServerHealthProvider'
    );
  }
  return context;
};

export const CentralServerHealthProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [status, setStatus] = React.useState<CentralServerStatus>('healthy');
  const [showWarningOverlay, setShowWarningOverlay] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [nextRetrySeconds, setNextRetrySeconds] = React.useState<number | null>(
    null
  );
  const { cookies } = useCookiesContext();

  // Debounce health checks to avoid spam
  const healthCheckTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Abort controller to prevent race conditions
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Exponential backoff retry state
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const retryAttemptRef = React.useRef<number>(0);
  const isRetryingRef = React.useRef<boolean>(false);

  // Calculate exponential backoff delay (capped at maximum)
  const getRetryDelay = React.useCallback((attempt: number): number => {
    const delay = Math.min(
      RETRY_BASE_DELAY_MS * Math.pow(2, attempt),
      RETRY_MAX_DELAY_MS
    );
    return delay;
  }, []);

  // Stop retry mechanism
  const stopRetrying = React.useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isRetryingRef.current = false;
    retryAttemptRef.current = 0;
    setNextRetrySeconds(null);
  }, []);

  // Start exponential backoff retry
  const startRetrying = React.useCallback(() => {
    if (isRetryingRef.current) {
      return; // Already retrying
    }

    isRetryingRef.current = true;
    retryAttemptRef.current = 0;

    const scheduleNextRetry = () => {
      const delay = getRetryDelay(retryAttemptRef.current);
      logger.debug(
        `Scheduling next health check retry in ${delay}ms (attempt ${retryAttemptRef.current + 1})`
      );

      // Set the countdown seconds for the overlay
      setNextRetrySeconds(Math.ceil(delay / MS_PER_SECOND));

      retryTimeoutRef.current = setTimeout(async () => {
        retryAttemptRef.current++;

        // Stop retrying if we've exceeded the maximum attempts
        if (retryAttemptRef.current > MAX_RETRY_ATTEMPTS) {
          logger.warn(`Stopping retries after ${MAX_RETRY_ATTEMPTS} attempts`);
          stopRetrying();
          return;
        }

        // Perform health check directly without calling checkHealth to avoid circular dependency
        try {
          // Cancel any existing health check and create new abort controller
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          abortControllerRef.current = new AbortController();

          setIsChecking(true);
          setStatus('checking');

          const healthStatus = await checkCentralServerHealth(cookies['_xsrf']);

          // Check if this request was aborted
          if (abortControllerRef.current?.signal.aborted) {
            return;
          }

          setStatus(healthStatus);

          if (healthStatus === 'healthy') {
            setShowWarningOverlay(false);
            logger.debug('Central server detected as healthy during retry');
            stopRetrying();
          } else if (healthStatus === 'down') {
            logger.warn(
              `Central server still down during retry (attempt ${retryAttemptRef.current}/${MAX_RETRY_ATTEMPTS})`
            );
            // Continue retrying if we haven't exceeded max attempts
            if (retryAttemptRef.current < MAX_RETRY_ATTEMPTS) {
              scheduleNextRetry();
            } else {
              logger.warn(`Maximum retry attempts reached, stopping`);
              stopRetrying();
            }
          }
        } catch (error) {
          logger.error('Error during retry health check:', error);
          setStatus('down');
          // Continue retrying if we haven't exceeded max attempts
          if (retryAttemptRef.current < MAX_RETRY_ATTEMPTS) {
            scheduleNextRetry();
          } else {
            logger.warn(`Maximum retry attempts reached, stopping`);
            stopRetrying();
          }
        } finally {
          setIsChecking(false);
        }
      }, delay);
    };

    scheduleNextRetry();
  }, [getRetryDelay, stopRetrying, cookies]);

  const checkHealth = React.useCallback(async () => {
    if (isChecking) {
      return; // Already checking, avoid duplicate checks
    }

    // Cancel any existing health check
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsChecking(true);
    setStatus('checking');

    try {
      const healthStatus = await checkCentralServerHealth(cookies['_xsrf']);

      // Check if this request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setStatus(healthStatus);

      if (healthStatus === 'down') {
        setShowWarningOverlay(true);
        logger.warn('Central server detected as down');
        // Start exponential backoff retries
        startRetrying();
      } else if (healthStatus === 'healthy') {
        setShowWarningOverlay(false);
        logger.debug('Central server detected as healthy');
        // Stop retrying since server is healthy
        stopRetrying();
      }
    } catch (error) {
      logger.error('Error during health check:', error);
      setStatus('down');
      setShowWarningOverlay(true);
      // Start exponential backoff retries
      startRetrying();
    } finally {
      setIsChecking(false);
    }
  }, [cookies, isChecking, startRetrying, stopRetrying]);

  const reportFailedRequest = React.useCallback(
    async (apiPath: string, responseStatus?: number) => {
      // Only trigger health check if this looks like a central server issue
      if (!shouldTriggerHealthCheck(apiPath, responseStatus)) {
        return;
      }

      // Don't check if already checking or already known to be down
      if (isChecking || status === 'down') {
        return;
      }

      // Don't trigger if already retrying (additional safety)
      if (isRetryingRef.current) {
        return;
      }

      logger.debug(
        `Failed request to ${apiPath} (${responseStatus}), triggering health check`
      );

      // Debounce health checks - clear any pending check and schedule a new one
      if (healthCheckTimeoutRef.current) {
        clearTimeout(healthCheckTimeoutRef.current);
      }

      healthCheckTimeoutRef.current = setTimeout(() => {
        checkHealth();
      }, HEALTH_CHECK_DEBOUNCE_MS);
    },
    [checkHealth, isChecking, status]
  );

  const dismissWarning = React.useCallback(() => {
    setShowWarningOverlay(false);
  }, []);

  // Register health check reporter with global sendFetchRequest
  React.useEffect(() => {
    setHealthCheckReporter(reportFailedRequest);
    return () => {
      clearHealthCheckReporter();
    };
  }, [reportFailedRequest]);

  // Cleanup timeouts and abort controllers on unmount
  React.useEffect(() => {
    return () => {
      if (healthCheckTimeoutRef.current) {
        clearTimeout(healthCheckTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      isRetryingRef.current = false;
    };
  }, []);

  return (
    <CentralServerHealthContext.Provider
      value={{
        status,
        checkHealth,
        reportFailedRequest,
        dismissWarning,
        showWarningOverlay,
        nextRetrySeconds
      }}
    >
      {children}
    </CentralServerHealthContext.Provider>
  );
};

export default CentralServerHealthContext;
