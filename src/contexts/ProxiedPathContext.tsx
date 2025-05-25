import React from 'react';
import { useCookiesContext } from '@/contexts/CookiesContext';
import { getAPIPathRoot, sendFetchRequest } from '@/utils';
import { useZoneBrowserContext } from './ZoneBrowserContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

// TODO: Make this configurable
const proxyBaseUrl = 'https://rokickik-dev.int.janelia.org:7878/files';

type ProxiedPath = {
  mount_path: string;
  sharing_key: string;
  sharing_name: string;
  username: string;
};

type ProxiedPathContextType = {
  proxiedPath: ProxiedPath | null;
  dataUrl: string | null;
  createProxiedPath: (mountPath: string) => Promise<ProxiedPath | null>;
};

const ProxiedPathContext = React.createContext<ProxiedPathContextType | null>(
  null
);

export const useProxiedPathContext = () => {
  const context = React.useContext(ProxiedPathContext);
  if (!context) {
    throw new Error(
      'useProxiedPathContext must be used within a ProxiedPathProvider'
    );
  }
  return context;
};

export const ProxiedPathProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [proxiedPath, setProxiedPath] = React.useState<ProxiedPath | null>(null);
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const { cookies } = useCookiesContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  const { currentNavigationPath } = useFileBrowserContext();

  function updateProxiedPath(proxiedPath: ProxiedPath | null) {
    setProxiedPath(proxiedPath);
    if (proxiedPath) { 
      setDataUrl(`${proxyBaseUrl}/${proxiedPath.sharing_key}/${proxiedPath.sharing_name}`);
    }
    else {
      setDataUrl(null);
    }
  }

  async function fetchProxiedPath(): Promise<ProxiedPath | null> {
    try {
      const filePath = currentNavigationPath.replace('?subpath=', '/');
      const filePathWithoutFsp = filePath.split('/').slice(1).join('/');
      const mountPath = `${currentFileSharePath?.mount_path}/${filePathWithoutFsp}`;
      const response = await sendFetchRequest(
        `${getAPIPathRoot()}api/fileglancer/proxied-path?mount_path=${mountPath}`,
        'GET',
        cookies['_xsrf']
      );
      if (!response.ok) {
        console.error(`Failed to fetch proxied path: ${response.status} ${response.statusText}`);
        return null;
      }
      const data = await response.json() as any;
      if (data?.paths) {
        return data.paths[0] as ProxiedPath;
      }
    } catch (error) {
      console.error('Error fetching proxied path:', error);
    }
    return null;
  }

  async function createProxiedPath(mountPath: string): Promise<ProxiedPath | null> {
    const response = await sendFetchRequest(
      `${getAPIPathRoot()}api/fileglancer/proxied-path`,
      'POST',
      cookies['_xsrf'],
      { mount_path: mountPath }
    );
    if (!response.ok) {
      throw new Error(`Failed to create proxied path: ${response.status} ${response.statusText}`);
    }
    const proxiedPath = await response.json() as ProxiedPath;
    updateProxiedPath(proxiedPath);
    console.log('Created proxied path:', proxiedPath);
    return proxiedPath;
  }

  React.useEffect(() => {
    (async function () {
      try {
        const path = await fetchProxiedPath();
        if (path) {
          updateProxiedPath(path);
        }
        else {
          updateProxiedPath(null);
        }
      } catch (error) {
        console.error('Error in useEffect:', error);
      }
    })();
  }, [currentFileSharePath, currentNavigationPath]);

  return (
    <ProxiedPathContext.Provider
      value={{ proxiedPath, dataUrl, createProxiedPath }}
    >
      {children}
    </ProxiedPathContext.Provider>
  );
};

export default ProxiedPathContext;
