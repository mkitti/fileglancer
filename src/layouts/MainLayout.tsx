import { Outlet, useParams } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';

import { CookiesProvider } from '@/contexts/CookiesContext';
import { ZonesAndFspMapContextProvider } from '@/contexts/ZonesAndFspMapContext';
import { FileBrowserContextProvider } from '@/contexts/FileBrowserContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { ProxiedPathProvider } from '@/contexts/ProxiedPathContext';
import { OpenFavoritesProvider } from '@/contexts/OpenFavoritesContext';
import FileglancerNavbar from '@/components/ui/Navbar/Navbar';
import { BetaBanner } from '@/components/ui/Beta';
import ErrorFallback from '@/components/ErrorFallback';

export const MainLayout = () => {
  const params = useParams();
  const fspName = params.fspName;
  const filePath = params['*']; // Catch-all for file path

  return (
    <CookiesProvider>
      <ZonesAndFspMapContextProvider>
        <OpenFavoritesProvider>
          <PreferencesProvider>
            <FileBrowserContextProvider fspName={fspName} filePath={filePath}>
              <ProxiedPathProvider>
                <Toaster
                  position="bottom-center"
                  toastOptions={{
                    className: 'min-w-fit',
                    success: { duration: 4000 }
                  }}
                />
                <div className="flex flex-col items-center h-full w-full overflow-y-hidden bg-background text-foreground box-border">
                  <FileglancerNavbar />
                  <BetaBanner />
                  <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <Outlet />
                  </ErrorBoundary>
                </div>
              </ProxiedPathProvider>
            </FileBrowserContextProvider>
          </PreferencesProvider>
        </OpenFavoritesProvider>
      </ZonesAndFspMapContextProvider>
    </CookiesProvider>
  );
};
