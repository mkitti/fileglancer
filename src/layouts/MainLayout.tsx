import { Outlet } from 'react-router';

import { CookiesProvider } from '@/contexts/CookiesContext';
import { ZoneBrowserContextProvider } from '@/contexts/ZoneBrowserContext';
import { FileBrowserContextProvider } from '@/contexts/FileBrowserContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { SharedPathsProvider } from '@/contexts/SharedPathsContext';
import FileglancerNavbar from '@/components/ui/Navbar';

export const MainLayout = () => {
  return (
    <CookiesProvider>
      <ZoneBrowserContextProvider>
        <PreferencesProvider>
          <FileBrowserContextProvider>
            <SharedPathsProvider>
              <div className="flex flex-col items-center h-full w-full overflow-y-hidden bg-background text-foreground box-border">
                <FileglancerNavbar />
                <Outlet />
              </div>
            </SharedPathsProvider>
          </FileBrowserContextProvider>
        </PreferencesProvider>
      </ZoneBrowserContextProvider>
    </CookiesProvider>
  );
};
