import * as React from 'react';
import { IconButton, Tooltip, Typography } from '@material-tailwind/react';
import { EmptyPage, Folder } from 'iconoir-react';
import { EllipsisHorizontalCircleIcon } from '@heroicons/react/24/outline';

import FileListCrumbs from './FileListCrumbs';

import { File } from '../../hooks/useFileBrowser';
import { formatDate, formatFileSize } from '../../utils';

type FileListProps = {
  displayFiles: File[];
  currentPath: string;
  selectedFiles: string[];
  selectedZone: string | null;
  getFiles: (path: string) => void;
  showFileDrawer: boolean;
  handleContextMenu: (e: React.MouseEvent<HTMLDivElement>, file: File) => void;
  handleLeftClicks: (e: React.MouseEvent<HTMLDivElement>, file: File) => void;
};

export default function FileList({
  displayFiles,
  currentPath,
  selectedFiles,
  selectedZone,
  getFiles,
  showFileDrawer,
  handleContextMenu,
  handleLeftClicks
}: FileListProps): JSX.Element {
  return (
    <div
      className={`px-2 transition-all duration-300 ${showFileDrawer ? 'mr-[350px]' : ''}`}
    >
      <FileListCrumbs
        currentPath={currentPath}
        selectedZone={selectedZone}
        getFiles={getFiles}
      />
      <div className="min-w-full bg-background">
        {/* Header row */}
        <div className="grid grid-cols-[minmax(200px,2fr)_minmax(85px,1fr)_minmax(100px,1fr)_minmax(75px,1fr)_40px] gap-4 p-0 text-foreground">
          <div className="flex w-full gap-3 px-3 py-1">
            <Typography variant="small" className="font-bold">
              Name
            </Typography>
          </div>

          <Typography variant="small" className="font-bold">
            Type
          </Typography>

          <Typography variant="small" className="font-bold">
            Last Modified
          </Typography>

          <Typography variant="small" className="font-bold">
            Size
          </Typography>

          <div className="w-[1.5em] h-[1.5em]"></div>
        </div>

        {/* File rows */}
        {displayFiles.length > 0 &&
          displayFiles.map((file, index) => {
            const isSelected = selectedFiles.includes(file.name);

            return (
              <div
                key={file.name}
                className={`cursor-pointer grid grid-cols-[minmax(200px,2fr)_minmax(85px,1fr)_minmax(100px,1fr)_minmax(75px,1fr)_40px] gap-4 hover:bg-primary-light/30 focus:bg-primary-light/30 ${isSelected && 'bg-primary-light/30'} ${index % 2 === 0 && !isSelected && 'bg-surface/50'}  `}
                onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                  handleLeftClicks(e, file)
                }
                onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                  handleContextMenu(e, file)
                }
                onDoubleClick={() => {
                  if (file.is_dir) {
                    getFiles(`${selectedZone}?subpath=${file.path}`);
                  }
                }}
              >
                {/* Name column */}
                <div className="flex items-center w-full gap-3 pl-3 py-1 text-primary-light">
                  <Typography variant="small" className="font-medium">
                    {file.name}
                  </Typography>
                </div>

                {/* Type column */}
                <div className="flex items-center w-full gap-3 py-1 text-grey-700 ">
                  {file.is_dir ? (
                    <Folder className="text-foreground" />
                  ) : (
                    <EmptyPage className="text-foreground" />
                  )}
                  <Typography variant="small" className="font-medium">
                    {file.is_dir ? 'Folder' : 'File'}
                  </Typography>
                </div>

                {/* Last Modified column */}
                <div className="py-1 text-grey-700  flex items-center">
                  <Typography variant="small" className="font-medium">
                    {formatDate(file.last_modified)}
                  </Typography>
                </div>

                {/* Size column */}
                <div className="py-1 text-grey-700 flex items-center">
                  <Typography variant="small" className="font-medium">
                    {file.is_dir ? '—' : formatFileSize(file.size)}
                  </Typography>
                </div>
                {/* Context menu button */}
                <div
                  className="py-1 text-grey-700 flex items-center"
                  onClick={e => {
                    handleContextMenu(e, file);
                  }}
                >
                  <Tooltip placement="top">
                    <Tooltip.Trigger as={IconButton} variant="ghost">
                      <EllipsisHorizontalCircleIcon className="h-5 w-5 text-grey-700 hover:text-primary-light" />
                      <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
                        <Typography type="small" className="opacity-90">
                          View actions
                        </Typography>
                        <Tooltip.Arrow />
                      </Tooltip.Content>
                    </Tooltip.Trigger>
                  </Tooltip>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
