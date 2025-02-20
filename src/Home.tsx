import React from 'react';
import { Outlet } from 'react-router';
import Navbar from './components/Navbar';

export default function Home() {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <Navbar />
      <h1>Outlet</h1>
      <Outlet />
    </div>
  );
}
