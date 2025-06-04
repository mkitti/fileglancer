import { Outlet } from 'react-router';
import { Toaster } from 'react-hot-toast';

import { CookiesProvider } from '@/contexts/CookiesContext';
import { FileBrowserContextProvider } from '@/contexts/FileBrowserContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { ProxiedPathProvider } from '@/contexts/ProxiedPathContext';
import FileglancerNavbar from '@/components/ui/Navbar';

export const MainLayout = () => {
  return (
    <CookiesProvider>
      <FileBrowserContextProvider>
        <PreferencesProvider>
          <ProxiedPathProvider>
            <Toaster />
            <div className="flex flex-col items-center h-full w-full overflow-y-hidden bg-background text-foreground box-border">
              <FileglancerNavbar />
              <Outlet />
            </div>
          </ProxiedPathProvider>
        </PreferencesProvider>
      </FileBrowserContextProvider>
    </CookiesProvider>
  );
};
