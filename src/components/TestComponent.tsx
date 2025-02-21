import React from 'react';
import { Link, Outlet } from 'react-router';
import { Toggle } from './Toggle';
import { FileList } from './FileList';

export const TestComponent = () => {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <Link to="/lab/about">Go to About</Link>
      <Link to="/lab/test">Go to Test</Link>
      <Link to="/lab/foobar">Go to Foobar</Link>
      <Outlet />
      <Toggle />
      <FileList />
    </div>
  );
};
