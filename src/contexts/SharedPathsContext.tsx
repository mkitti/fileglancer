import React from 'react';
import { useCookiesContext } from '@/contexts/CookiesContext';
import { getAPIPathRoot, sendFetchRequest } from '@/utils';

type FetchSharedPathsData = {
  mount_path: string;
  sharing_key: string;
  sharing_name: string;
  username: string;
};

type SharedPathsContextType = {
  sharedPaths: Record<string, FetchSharedPathsData>;
  fetchAndSetLocalSharedPaths: () => Promise<void>;
  createSharedPath: (mountPath: string) => Promise<void>;
};

const SharedPathsContext = React.createContext<SharedPathsContextType | null>(
  null
);

export const useSharedPathsContext = () => {
  const context = React.useContext(SharedPathsContext);
  if (!context) {
    throw new Error(
      'useSharedPathsContext must be used within a SharedPathsProvider'
    );
  }
  return context;
};

export const SharedPathsProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [sharedPaths, setSharedPaths] = React.useState<
    Record<string, FetchSharedPathsData>
  >({});
  const { cookies } = useCookiesContext();

  async function fetchSharedPaths(): Promise<FetchSharedPathsData[]> {
    let paths: FetchSharedPathsData[] = [];
    try {
      const response = await sendFetchRequest(
        `${getAPIPathRoot()}api/fileglancer/proxied-path`,
        'GET',
        cookies['_xsrf']
      );
      if (!response.ok) {
        throw new Error('Failed to fetch shared paths');
      }
      const data = await response.json();
      console.log('Fetched shared paths:', data.paths);
      paths = data.paths;
    } catch (error) {
      console.error('Error fetching shared paths:', error);
    }
    return paths;
  }

  async function createSharedPath(mountPath: string) {
    try {
      const response = await sendFetchRequest(
        `${getAPIPathRoot()}api/fileglancer/proxied-path`,
        'POST',
        cookies['_xsrf'],
        { mount_path: mountPath }
      );
      if (!response.ok) {
        throw new Error('Failed to create shared path');
      }
      const data = await response.json();
      console.log('Created shared path:', data);
    } catch (error) {
      console.error('Error creating shared path:', error);
    }
  }

  async function fetchAndSetLocalSharedPaths() {
    const backendPaths = await fetchSharedPaths();
    const pathsArray = backendPaths.map((path: FetchSharedPathsData) => {
      return { [path.mount_path]: { ...path } };
    });
    const pathsMap = Object.assign({}, ...pathsArray);
    setSharedPaths(pathsMap);
    console.log('Shared paths:', pathsMap);
  }

  React.useEffect(() => {
    (async function () {
      try {
        await fetchAndSetLocalSharedPaths();
      } catch (error) {
        console.error('Error in useEffect:', error);
      }
    })();
  }, []);

  return (
    <SharedPathsContext.Provider
      value={{ sharedPaths, fetchAndSetLocalSharedPaths, createSharedPath }}
    >
      {children}
    </SharedPathsContext.Provider>
  );
};

export default SharedPathsContext;
