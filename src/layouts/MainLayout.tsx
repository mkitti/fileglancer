import React from 'react';
import { Outlet } from 'react-router';
import FileglancerNavbar from '../components/ui/Navbar';

export const MainLayout = () => {
  return (
    <div className="h-full w-full overflow-y-scroll bg-background text-foreground box-border">
      <FileglancerNavbar />
      <Outlet />
    </div>
  );
};
