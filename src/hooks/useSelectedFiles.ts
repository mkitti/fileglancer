import React from 'react';
import type { FileOrFolder } from '../shared.types';

export default function useSelectedFiles() {
  const [selectedFiles, setSelectedFiles] = React.useState<FileOrFolder[]>([]);

  return {
    selectedFiles,
    setSelectedFiles
  };
}
