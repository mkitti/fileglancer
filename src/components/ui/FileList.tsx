import * as React from 'react';
import {
  List,
  ListItem,
  // Checkbox,
  // CheckboxIndicator,
  Typography
} from '@material-tailwind/react';
import { CustomCheckbox } from './CustomCheckbox';
import { EmptyPage, Folder } from 'iconoir-react';

import FileListCrumbs from './FileListCrumbs';
import useFileList from '../../hooks/useFileList';

export default function FileList(): JSX.Element {
  const { checked, content, currentPath, handleCheckboxToggle, getContents } =
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
      <div className="w-full max-w-[360px] bg-white">
        <List className="p-0">
          {content.length > 0 &&
            content.map(item => {
              const labelId = `checkbox-list-label-${item.name}`;
              const isChecked = checked.includes(item.name);

              return (
                <ListItem
                  key={item.name}
                  className="p-0 text-blue-500 hover:bg-blue-50/50"
                >
                  <div className="flex items-center w-full gap-3 px-3 py-1">
                    <div
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.stopPropagation();
                        handleCheckboxToggle(item);
                      }}
                    >
                      <CustomCheckbox id={labelId} checked={isChecked} />
                    </div>

                    <div
                      className="cursor-pointer"
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.stopPropagation();
                        getContents(item.path);
                      }}
                    >
                      {item.type === 'directory' ? (
                        <Folder className="text-gray-700" />
                      ) : (
                        <EmptyPage className="text-gray-700" />
                      )}
                    </div>

                    <Typography
                      variant="small"
                      className="font-medium"
                      onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                        e.stopPropagation();
                        getContents(item.path);
                      }}
                    >
                      {item.name}
                    </Typography>
                  </div>
                </ListItem>
              );
            })}
        </List>
      </div>
    </>
  );
}
