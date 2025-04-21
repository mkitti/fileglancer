import { useFileBrowserContext } from '../contexts/FileBrowserContext';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';

export default function useHandleFileSharePathClick() {
  const { fetchAndFormatFilesForDisplay } = useFileBrowserContext();
  const { setCurrentNavigationZone, setCurrentFileSharePath } =
    useZoneBrowserContext();

  // Handler for when a file share path is clicked in the sidebar
  const handleFileSharePathClick = (zone: string, path: string) => {
    setCurrentNavigationZone(zone);
    setCurrentFileSharePath(path);
    fetchAndFormatFilesForDisplay(path);
  };
  return { handleFileSharePathClick };
}
