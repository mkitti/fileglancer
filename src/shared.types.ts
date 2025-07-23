type FileOrFolder = {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  permissions: string;
  owner: string;
  group: string;
  last_modified: number;
};

type FileSharePath = {
  zone: string;
  name: string;
  group: string;
  storage: string;
  mount_path: string;
  linux_path: string | null;
  mac_path: string | null;
  windows_path: string | null;
};
// Note: linux_path, mac_path, and windows_path are null when running in local env with no fileglancer_central url set in the jupyter server config

type Zone = { name: string; fileSharePaths: FileSharePath[] };

type ZonesAndFileSharePathsMap = Record<string, FileSharePath | Zone>;

type Cookies = { [key: string]: string };

type Result<T, E extends Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type {
  FileOrFolder,
  FileSharePath,
  Zone,
  ZonesAndFileSharePathsMap,
  Cookies,
  Result
};
