import * as React from 'react';

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

export type FileSharePaths = {
  zone: string;
  group: string;
  storage: string;
  linux_path: string;
};

export default function useFileList() {
  const [checked, setChecked] = React.useState<string[]>([]);
  const [files, setFiles] = React.useState<File[]>([]);
  const [currentPath, setCurrentPath] = React.useState<File['path']>('');

  function handleCheckboxToggle(item: File) {
    const currentIndex = checked.indexOf(item.name);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(item.name);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  }

  async function getFiles(path: File['path']): Promise<void> {
    let url = '/fileglancer/files/';

    // Only append the path if it exists and is not empty
    if (path && path.trim() !== '') {
      url = `/fileglancer/files/${path}`;
    }

    let data = [];
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

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
    const url = '/fileglancer/file-share-paths/';
    let data: FileSharePaths[] = [];
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      data = await response.json();
      console.log(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unknown error occurred');
      }
    }
  }

  return {
    checked,
    files,
    currentPath,
    handleCheckboxToggle,
    getFiles,
    getFileSharePaths
  };
}
