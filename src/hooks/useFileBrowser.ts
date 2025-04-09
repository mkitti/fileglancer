import * as React from 'react';
import { useCookies } from 'react-cookie';
import { getAPIPathRoot, sendGetRequest } from '../utils';

export type File = {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  permissions: string;
  owner: string;
  group: string;
  last_modified: number;
};

export type FileSharePathItem = {
  zone: string;
  name: string;
  group: string;
  storage: string;
  mount_path: string;
  linux_path: string;
  mac_path: string | null;
  windows_path: string | null;
};

export type FileSharePaths = Record<string, FileSharePathItem[]>;

export default function useFileBrowser() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [currentPath, setCurrentPath] = React.useState<File['path']>('');
  const [fileSharePaths, setFileSharePaths] = React.useState<FileSharePaths>(
    {}
  );
  const [openZones, setOpenZones] = React.useState<Record<string, boolean>>({});
  const [selectedZone, setSelectedZone] = React.useState<string | null>(null);
  const [cookies] = useCookies(['_xsrf']);

  React.useEffect(() => {
    if (Object.keys(fileSharePaths).length === 0) {
      getFileSharePaths();
    }
  }, [fileSharePaths, getFileSharePaths]);

  function toggleZone(zone: string) {
    setOpenZones(prev => ({
      ...prev,
      [zone]: !prev[zone]
    }));
  }

  // Handler for when a path is clicked in the sidebar
  const handlePathClick = (path: string) => {
    setSelectedZone(path);
    getFiles(path);
  };

  async function getFiles(path: File['path']): Promise<void> {
    let cleanPath = path;

    if (path && path.trim() !== '') {
      // Remove leading slash from path if present to avoid double slashes
      cleanPath = path.trim().startsWith('/')
        ? path.trim().substring(1)
        : path.trim();
    }

    const url = `${getAPIPathRoot()}api/fileglancer/files/${cleanPath}`;

    let data = [];
    try {
      const response = await sendGetRequest(url, cookies['_xsrf']);

      data = await response.json();
      if (data) {
        setCurrentPath(path);
      }
      if (data.files) {
        // display directories first, then files
        // within a type (directories or files), display alphabetically
        data.files = data.files.sort((a: File, b: File) => {
          if (a.is_dir === b.is_dir) {
            return a.name.localeCompare(b.name);
          }
          return a.is_dir ? -1 : 1;
        });
        setFiles(data.files as File[]);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unknown error occurred');
      }
    }
  }

  async function getFileSharePaths() {
    const url = `${getAPIPathRoot()}api/fileglancer/file-share-paths`;

    try {
      const response = await sendGetRequest(url, cookies['_xsrf']);

      const rawData: { paths: FileSharePathItem[] } = await response.json();
      const unsortedPaths: FileSharePaths = {};

      rawData.paths.forEach(item => {
        if (!unsortedPaths[item.zone]) {
          unsortedPaths[item.zone] = [];
        }

        // Store the entire FileSharePathItem object instead of just a string path
        if (
          !unsortedPaths[item.zone].some(
            existingItem => existingItem.name === item.name
          )
        ) {
          unsortedPaths[item.zone].push(item);
        }
      });

      // Sort the items within each zone alphabetically by name
      Object.keys(unsortedPaths).forEach(zone => {
        unsortedPaths[zone].sort((a, b) => a.name.localeCompare(b.name));
      });

      // Create a new object with alphabetically sorted zone keys
      const sortedPaths: FileSharePaths = {};
      Object.keys(unsortedPaths)
        .sort()
        .forEach(zone => {
          sortedPaths[zone] = unsortedPaths[zone];
        });

      setFileSharePaths(sortedPaths);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unknown error occurred');
      }
    }
  }

  return {
    files,
    currentPath,
    fileSharePaths,
    openZones,
    selectedZone,
    setSelectedZone,
    getFiles,
    getFileSharePaths,
    toggleZone,
    handlePathClick
  };
}
