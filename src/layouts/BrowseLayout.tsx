import { Outlet } from 'react-router';

import Sidebar from '@/components/ui/Sidebar/Sidebar';

export const BrowseLayout = () => {
  return (
    <div className="flex h-full w-full overflow-y-hidden">
      <Sidebar />
      <Outlet />
    </div>
  );
};
