import * as React from 'react';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import FolderIcon from '@mui/icons-material/Folder';

import { Content } from '../../hooks/useFileList';

type FileListCrumbsProps = {
  currentPath: string;
  getContents: (path: Content['path']) => void;
};

export default function FileListCrumbs({
  currentPath,
  getContents
}: FileListCrumbsProps): JSX.Element {
  const dirArray = currentPath.split('/');
  const dirDepth = dirArray.length;
  return (
    <Breadcrumbs aria-label="breadcrumb">
      <Link
        component="button"
        underline="hover"
        color="inherit"
        onClick={() => getContents('')}
      >
        <FolderIcon />
      </Link>
      {dirArray.map((item, index) => {
        if (index < dirDepth - 1) {
          return (
            <Link
              key={item}
              component="button"
              underline="hover"
              color="inherit"
              onClick={() =>
                getContents(dirArray.slice(0, index + 1).join('/'))
              }
            >
              {item}
            </Link>
          );
        } else if (index === dirDepth - 1) {
          return (
            <Typography key={item} color="text.primary">
              {item}
            </Typography>
          );
        }
      })}
    </Breadcrumbs>
  );
}
