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
  linux_path: string;
  mac_path: string;
  windows_path: string;
};

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
