import { Outlet } from 'react-router';
import { ErrorBoundary } from 'react-error-boundary';

import ErrorFallback from '@/components/ErrorFallback';

export const OtherPagesLayout = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="w-full overflow-y-auto">
        <Outlet />
      </div>
    </ErrorBoundary>
  );
};
