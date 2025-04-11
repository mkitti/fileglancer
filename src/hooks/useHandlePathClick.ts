import { useFileBrowserContext } from '../contexts/FileBrowserContext';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';

export default function useHandlePathClick() {
  const { fetchAndFormatFilesForDisplay } = useFileBrowserContext();
  const { setCurrentNavigationZone } = useZoneBrowserContext();

  // Handler for when a path is clicked in the sidebar
  const handlePathClick = (path: string) => {
    setCurrentNavigationZone(path);
    fetchAndFormatFilesForDisplay(path);
  };
  return { handlePathClick };
}
