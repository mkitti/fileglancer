import * as React from 'react';
import { IconButton, Tooltip, Typography } from '@material-tailwind/react';
import {
  DocumentIcon,
  EllipsisHorizontalCircleIcon,
  FolderIcon
} from '@heroicons/react/24/outline';

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
        <div className="min-w-fit grid grid-cols-[minmax(170px,2fr)_minmax(80px,1fr)_minmax(95px,1fr)_minmax(75px,1fr)_minmax(40px,1fr)] gap-4 p-0 text-foreground">
          <div className="flex w-full gap-3 px-3 py-1 overflow-x-auto">
            <Typography variant="small" className="font-bold">
              Name
            </Typography>
          </div>

          <Typography variant="small" className="font-bold overflow-x-auto">
            Type
          </Typography>

          <Typography variant="small" className="font-bold overflow-x-auto">
            Last Modified
          </Typography>

          <Typography variant="small" className="font-bold overflow-x-auto">
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
                className={`cursor-pointer min-w-fit grid grid-cols-[minmax(170px,2fr)_minmax(80px,1fr)_minmax(95px,1fr)_minmax(75px,1fr)_minmax(40px,1fr)] gap-4 hover:bg-primary-light/30 focus:bg-primary-light/30 ${isSelected && 'bg-primary-light/30'} ${index % 2 === 0 && !isSelected && 'bg-surface/50'}  `}
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
                <div className="flex items-center w-full gap-3 pl-3 py-1 text-primary-light overflow-x-auto">
                  <Typography variant="small" className="font-medium">
                    {file.name}
                  </Typography>
                </div>

                {/* Type column */}
                <div className="flex items-center w-full gap-3 py-1 text-grey-700 overflow-x-auto">
                  {file.is_dir ? (
                    <FolderIcon className="text-foreground h-5 w-5" />
                  ) : (
                    <DocumentIcon className="text-foreground h-5 w-5" />
                  )}
                  <Typography variant="small" className="font-medium">
                    {file.is_dir ? 'Folder' : 'File'}
                  </Typography>
                </div>

                {/* Last Modified column */}
                <div className="py-1 text-grey-700  flex items-center overflow-x-auto">
                  <Typography variant="small" className="font-medium">
                    {formatDate(file.last_modified)}
                  </Typography>
                </div>

                {/* Size column */}
                <div className="py-1 text-grey-700 flex items-cente overflow-x-auto">
                  <Typography variant="small" className="font-medium">
                    {file.is_dir ? '—' : formatFileSize(file.size)}
                  </Typography>
                </div>

                {/* Context menu button */}
                <div
                  className="py-1 text-grey-700 flex items-center overflow-x-auto"
                  onClick={e => {
                    handleContextMenu(e, file);
                  }}
                >
                  <IconButton variant="ghost">
                    <EllipsisHorizontalCircleIcon className="h-5 w-5 text-foreground" />
                  </IconButton>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
