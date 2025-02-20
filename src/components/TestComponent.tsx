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
      <Toggle />
      <FileList />
    </div>
  );
};
