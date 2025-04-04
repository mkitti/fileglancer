import React from 'react';
import { Outlet } from 'react-router';
import FileglancerNavbar from '../components/ui/Navbar';

export const MainLayout = () => {
  return (
    <div className="h-svh w-full overflow-y-hidden bg-background text-foreground box-border">
      <FileglancerNavbar />
      <Outlet />
    </div>
  );
};
