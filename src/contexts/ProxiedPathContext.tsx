import React from 'react';
import { default as log } from '@/logger';
import { useCookiesContext } from '@/contexts/CookiesContext';
import { getAPIPathRoot, sendFetchRequest } from '@/utils/index';
import { makeSharedDataUrl } from '@/utils/proxiedPaths';
import { useZoneBrowserContext } from './ZoneBrowserContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

export type ProxiedPath = {
  username: string;
  sharing_key: string;
  sharing_name: string;
  created_at: string;
  updated_at: string;
  fsp_mount_path: string;
  path: string;
};

type ProxiedPathContextType = {
  proxiedPath: ProxiedPath | null;
  dataUrl: string | null;
  allProxiedPaths?: ProxiedPath[];
  createProxiedPath: (
    fspMountPath: string,
    path: string
  ) => Promise<ProxiedPath | null>;
  deleteProxiedPath: () => Promise<void>;
};

function sortProxiedPathsByDate(paths: ProxiedPath[]): ProxiedPath[] {
  return paths.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

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
  const [allProxiedPaths, setAllProxiedPaths] = React.useState<ProxiedPath[]>(
    []
  );
  const [proxiedPath, setProxiedPath] = React.useState<ProxiedPath | null>(
    null
  );
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const { cookies } = useCookiesContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  const { currentNavigationPath } = useFileBrowserContext();

  function updateProxiedPath(proxiedPath: ProxiedPath | null) {
    setProxiedPath(proxiedPath);
    if (proxiedPath) {
      setDataUrl(makeSharedDataUrl(proxiedPath));
    } else {
      setDataUrl(null);
    }
  }

  const fetchAllProxiedPaths = React.useCallback(async (): Promise<void> => {
    const response = await sendFetchRequest(
      `${getAPIPathRoot()}api/fileglancer/proxied-path`,
      'GET',
      cookies['_xsrf']
    );
    if (!response.ok) {
      let errorMsg = `HTTP error: ${response.status}`;
      try {
        const data = await response.json();
        if (data && data.error) {
          errorMsg = data.error;
        }
      } catch (e) {
        // response was not JSON, keeping default errorMsg...
      }
      throw new Error(errorMsg);
    }
    const data = await response.json();
    if (data?.paths) {
      setAllProxiedPaths(sortProxiedPathsByDate(data.paths) as ProxiedPath[]);
    }
  }, [cookies]);

  const fetchProxiedPath =
    React.useCallback(async (): Promise<ProxiedPath | null> => {
      const filePath = currentNavigationPath.replace('?subpath=', '/');
      const filePathWithoutFsp = filePath.split('/').slice(1).join('/');
      if (!currentFileSharePath || !filePathWithoutFsp) {
        return null;
      }
      try {
        log.debug(
          'Fetching proxied path for',
          currentFileSharePath?.mount_path,
          filePathWithoutFsp
        );
        const response = await sendFetchRequest(
          `${getAPIPathRoot()}api/fileglancer/proxied-path?fsp_mount_path=${currentFileSharePath?.mount_path}&path=${filePathWithoutFsp}`,
          'GET',
          cookies['_xsrf']
        );
        if (!response.ok) {
          log.error(
            `Failed to fetch proxied path: ${response.status} ${response.statusText}`
          );
          return null;
        }
        const data = (await response.json()) as any;
        if (data?.paths) {
          return data.paths[0] as ProxiedPath;
        }
      } catch (error) {
        log.error('Error fetching proxied path:', error);
      }
      return null;
    }, [currentFileSharePath, currentNavigationPath, cookies]);

  async function createProxiedPath(
    fspMountPath: string,
    path: string
  ): Promise<ProxiedPath | null> {
    const response = await sendFetchRequest(
      `${getAPIPathRoot()}api/fileglancer/proxied-path`,
      'POST',
      cookies['_xsrf'],
      { fsp_mount_path: fspMountPath, path: path }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to create proxied path: ${response.status} ${response.statusText}`
      );
    }
    const proxiedPath = (await response.json()) as ProxiedPath;
    updateProxiedPath(proxiedPath);
    log.debug('Created proxied path:', proxiedPath);
    return proxiedPath;
  }

  async function deleteProxiedPath(): Promise<void> {
    if (!proxiedPath) {
      log.error('No proxied path to delete');
      return;
    }
    const response = await sendFetchRequest(
      `${getAPIPathRoot()}api/fileglancer/proxied-path?sharing_key=${proxiedPath.sharing_key}`,
      'DELETE',
      cookies['_xsrf']
    );
    if (!response.ok) {
      throw new Error(
        `Failed to delete proxied path: ${response.status} ${response.statusText}`
      );
    }
    log.debug('Deleted proxied path:', proxiedPath);
    updateProxiedPath(null);
  }

  React.useEffect(() => {
    (async function () {
      await fetchAllProxiedPaths();
    })();
  }, [fetchAllProxiedPaths, proxiedPath]);

  React.useEffect(() => {
    (async function () {
      try {
        const path = await fetchProxiedPath();
        if (path) {
          updateProxiedPath(path);
        } else {
          updateProxiedPath(null);
        }
      } catch (error) {
        log.error('Error in useEffect:', error);
      }
    })();
  }, [currentFileSharePath, currentNavigationPath, fetchProxiedPath]);

  return (
    <ProxiedPathContext.Provider
      value={{
        proxiedPath,
        dataUrl,
        allProxiedPaths,
        createProxiedPath,
        deleteProxiedPath
      }}
    >
      {children}
    </ProxiedPathContext.Provider>
  );
};

export default ProxiedPathContext;
