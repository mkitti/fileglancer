import React from 'react';
import { useFileBrowserContext } from '../contexts/FileBrowserContext';
import { usePreferencesContext } from '../contexts/PreferencesContext';

export default function useHideDotFiles() {
  const { hideDotFiles } = usePreferencesContext();
  const { files } = useFileBrowserContext();

  const displayFiles = React.useMemo(() => {
    return hideDotFiles
      ? files.filter(file => !file.name.startsWith('.'))
      : files;
  }, [files, hideDotFiles]);

  return {
    displayFiles
  };
}
