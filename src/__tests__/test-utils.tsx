// https://testing-library.com/docs/react-testing-library/setup
import React from 'react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';
import { render, RenderOptions } from '@testing-library/react';

import { CookiesProvider as ReactCookiesProvider } from 'react-cookie';
import { ErrorBoundary } from 'react-error-boundary';
import { CookiesProvider } from '@/contexts/CookiesContext';
import { ZonesAndFspMapContextProvider } from '@/contexts/ZonesAndFspMapContext';
import { FileBrowserContextProvider } from '@/contexts/FileBrowserContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { ProxiedPathProvider } from '@/contexts/ProxiedPathContext';
import { OpenFavoritesProvider } from '@/contexts/OpenFavoritesContext';
import ErrorFallback from '@/components/ErrorFallback';

const MockRouterAndProviders = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const params = useParams();
  const fspName = params.fspName;
  const filePath = params['*']; // Catch-all for file path
  return (
    <ReactCookiesProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <MemoryRouter>
          <CookiesProvider>
            <ZonesAndFspMapContextProvider>
              <OpenFavoritesProvider>
                <PreferencesProvider>
                  <FileBrowserContextProvider
                    fspName={fspName}
                    filePath={filePath}
                  >
                    <ProxiedPathProvider>{children}</ProxiedPathProvider>
                  </FileBrowserContextProvider>
                </PreferencesProvider>
              </OpenFavoritesProvider>
            </ZonesAndFspMapContextProvider>
          </CookiesProvider>
        </MemoryRouter>
      </ErrorBoundary>
    </ReactCookiesProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: MockRouterAndProviders, ...options });
};

export * from '@testing-library/react';
export { customRender as render };
