import * as React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import FolderIcon from '@mui/icons-material/Folder';

import FileListCrumbs from './file-list/FileListCrumbs';
import useFileList from '../hooks/useFileList';

export const FileList = (): JSX.Element => {
  const { checked, content, currentPath, handleClick, getContents } =
    useFileList();

  React.useEffect(() => {
    if (content.length === 0) {
      getContents();
    }
  }, [getContents]);
  console.log('content:', content);

  return (
    <>
      <FileListCrumbs currentPath={currentPath} getContents={getContents} />
      {/* TODO: add breadcrumbs */}
      <List
        sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
        dense
      >
        {content.length > 0 &&
          content.map(item => {
            const labelId = `checkbox-list-label-${item.name}`;

            return (
              <ListItem
                key={item.name}
                disablePadding
                disableGutters
                className="text-blue-500"
              >
                <ListItemButton
                  role={undefined}
                  onClick={(e: React.MouseEvent) => handleClick(e, item)}
                  dense
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={checked.includes(item.name)}
                      tabIndex={-1}
                      disableRipple
                      inputProps={{ 'aria-labelledby': labelId }}
                    />
                  </ListItemIcon>
                  <ListItemIcon>
                    {item.type === 'directory' ? (
                      <FolderIcon />
                    ) : (
                      <InsertDriveFileOutlinedIcon />
                    )}
                  </ListItemIcon>
                  <ListItemText id={labelId} primary={`${item.name}`} />
                </ListItemButton>
              </ListItem>
            );
          })}
      </List>
    </>
  );
};
