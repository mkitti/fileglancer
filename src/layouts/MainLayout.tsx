import { Outlet } from 'react-router';

import { CookiesProvider } from '@/contexts/CookiesContext';
import { ZoneBrowserContextProvider } from '@/contexts/ZoneBrowserContext';
import { FileBrowserContextProvider } from '@/contexts/FileBrowserContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { ProxiedPathProvider } from '@/contexts/ProxiedPathContext';
import FileglancerNavbar from '@/components/ui/Navbar';

export const MainLayout = () => {
  return (
    <CookiesProvider>
      <ZoneBrowserContextProvider>
        <PreferencesProvider>
          <FileBrowserContextProvider>
            <ProxiedPathProvider>
              <div className="flex flex-col items-center h-full w-full overflow-y-hidden bg-background text-foreground box-border">
                <FileglancerNavbar />
                <Outlet />
              </div>
            </ProxiedPathProvider>
          </FileBrowserContextProvider>
        </PreferencesProvider>
      </ZoneBrowserContextProvider>
    </CookiesProvider>
  );
};
