import * as React from 'react';

export type Content = {
  content: string | Content[] | null;
  created: string;
  format: null | 'text' | 'base64' | 'json';
  hash?: string;
  hash_algorithm?: string;
  last_modified: string;
  mimetype: string | null;
  name: string;
  path: string;
  size: number;
  type: string;
  writable: boolean;
};

export default function useFileList() {
  const [checked, setChecked] = React.useState<string[]>([]);
  const [content, setContent] = React.useState<Content[]>([]);

  // e = event
  const handleClick = (e: React.MouseEvent, item: Content) => {
    if (e.detail === 1) {
      const currentIndex = checked.indexOf(item.name);
      const newChecked = [...checked];

      if (currentIndex === -1) {
        newChecked.push(item.name);
      } else {
        newChecked.splice(currentIndex, 1);
      }

      setChecked(newChecked);
    } else if (e.detail === 2) {
      console.log('double click', item.name);
      getContents(item.path);
    }
  };

  async function getContents(path?: Content['path']): Promise<void> {
    const url = `http://localhost:8888/api/contents/${path ? path + '/' : ''}?content=1`;
    let data = [];
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      data = await response.json();
      if (data.content) {
        // display directories first, then files
        // within a type (directories or files), display alphabetically
        data.content = data.content.sort((a: Content, b: Content) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          }
          return a.type === 'directory' ? -1 : 1;
        });
        setContent(data.content as Content[]);
      }
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
    content,
    handleClick,
    getContents
  };
}
