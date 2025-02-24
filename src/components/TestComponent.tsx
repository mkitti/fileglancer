import React from 'react';
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
      <div className="bg-green-500 text-white p-4 rounded-lg text-lg">
        Hello from Tailwind CSS!
      </div>
      <Toggle />
      <FileList />
    </div>
  );
};
