import React from 'react';
import { useCookiesContext } from '@/contexts/CookiesContext';
import { getAPIPathRoot, sendFetchRequest } from '@/utils';

type SharedPathsContextType = {
  sharedPaths: string[];
  fetchSharedPaths: () => Promise<void>;
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
  const [sharedPaths, setSharedPaths] = React.useState<string[]>([]);
  const { cookies } = useCookiesContext();

  async function fetchSharedPaths() {
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
      console.log('Fetched shared paths:', data);
      setSharedPaths(data.paths);
    } catch (error) {
      console.error('Error fetching shared paths:', error);
    }
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
      setSharedPaths(prevPaths => [...prevPaths, data.path]);
    } catch (error) {
      console.error('Error creating shared path:', error);
    }
  }

  React.useEffect(() => {
    fetchSharedPaths();
  }, []);

  return (
    <SharedPathsContext.Provider
      value={{ sharedPaths, fetchSharedPaths, createSharedPath }}
    >
      {children}
    </SharedPathsContext.Provider>
  );
};

export default SharedPathsContext;
