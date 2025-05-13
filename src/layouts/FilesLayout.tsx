import { Outlet } from 'react-router';
import Sidebar from '../components/ui/Sidebar/Sidebar';
import { ZoneBrowserContextProvider } from '../contexts/ZoneBrowserContext';

export const FilesLayout = () => {
  return (
    <ZoneBrowserContextProvider>
      <div className="flex h-full w-full overflow-y-hidden">
        <Sidebar />
        <Outlet />
      </div>
    </ZoneBrowserContextProvider>
  );
};
