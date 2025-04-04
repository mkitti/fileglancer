import * as React from 'react';
import { File } from '../hooks/useFileBrowser';

export default function useDisplayOptions(files: File[]) {
  const [selectedFiles, setSelectedFiles] = React.useState<string[]>([]);
  const [propertiesTarget, setPropertiesTarget] = React.useState<File | null>(
    null
  );
  const [hideDotFiles, setHideDotFiles] = React.useState<boolean>(true);
  const [showFileDrawer, setShowFileDrawer] = React.useState<boolean>(false);
  const [showFileContextMenu, setShowFileContextMenu] =
    React.useState<boolean>(false);
  const [contextMenuCoords, setContextMenuCoords] = React.useState({
    x: 0,
    y: 0
  });

  const displayFiles = React.useMemo(() => {
    return hideDotFiles
      ? files.filter(file => !file.name.startsWith('.'))
      : files;
  }, [files, hideDotFiles]);

  const handleContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    file: File
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setPropertiesTarget(file);
    setContextMenuCoords({ x: e.clientX, y: e.clientY });
    setShowFileContextMenu(true);
    const currentIndex = selectedFiles.indexOf(file.name);
    const newSelectedFiles =
      currentIndex === -1 ? [file.name] : [...selectedFiles];
    setSelectedFiles(newSelectedFiles);
  };

  const handleLeftClicks = (
    e: React.MouseEvent<HTMLDivElement>,
    file: File
  ) => {
    if (e.shiftKey) {
      // If shift key held down while clicking,
      // add all files between the last selected and the current file
      const lastSelectedIndex = selectedFiles.length
        ? files.findIndex(
            f => f.name === selectedFiles[selectedFiles.length - 1]
          )
        : -1;
      const currentIndex = files.findIndex(f => f.name === file.name);
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const newSelectedFiles = files.slice(start, end + 1).map(f => f.name);
      setSelectedFiles(newSelectedFiles);
      setPropertiesTarget(file);
    } else if (e.metaKey) {
      // If  "Windows/Cmd" is held down while clicking,
      // toggle the current file in the selection
      // and set it as the properties target
      const currentIndex = selectedFiles.indexOf(file.name);
      const newSelectedFiles = [...selectedFiles];

      if (currentIndex === -1) {
        newSelectedFiles.push(file.name);
      } else {
        newSelectedFiles.splice(currentIndex, 1);
      }

      setSelectedFiles(newSelectedFiles);
      setPropertiesTarget(file);
    } else {
      // If no modifier keys are held down, select the current file
      const currentIndex = selectedFiles.indexOf(file.name);
      const newSelectedFiles =
        currentIndex === -1 || selectedFiles.length > 1 || showFileDrawer
          ? [file.name]
          : [];
      setSelectedFiles(newSelectedFiles);
      const newPropertiesTarget =
        currentIndex === -1 || selectedFiles.length > 1 || showFileDrawer
          ? file
          : null;
      setPropertiesTarget(newPropertiesTarget);
    }
  };

  return {
    selectedFiles,
    setSelectedFiles,
    propertiesTarget,
    setPropertiesTarget,
    displayFiles,
    hideDotFiles,
    setHideDotFiles,
    showFileDrawer,
    setShowFileDrawer,
    showFileContextMenu,
    setShowFileContextMenu,
    contextMenuCoords,
    handleContextMenu,
    handleLeftClicks
  };
}
