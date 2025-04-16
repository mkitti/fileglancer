import { useFileBrowserContext } from '../contexts/FileBrowserContext';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';

export default function useHandleFileSharePathClick() {
  const { setCurrentNavigationPath, fetchAndFormatFilesForDisplay } =
    useFileBrowserContext();
  const { setCurrentNavigationZone } = useZoneBrowserContext();

  // Handler for when a file share path is clicked in the sidebar
  const handleFileSharePathClick = (zone: string, path: string) => {
    setCurrentNavigationZone(zone);
    setCurrentNavigationPath(path);
    fetchAndFormatFilesForDisplay(path);
  };
  return { handleFileSharePathClick };
}
