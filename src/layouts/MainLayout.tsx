import React from 'react';
import { Outlet } from 'react-router';
import FileglancerNavbar from '../components/ui/Navbar';

export const MainLayout = () => {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        overflowY: 'scroll'
      }}
    >
      <FileglancerNavbar />
      <Outlet />
    </div>
  );
};
