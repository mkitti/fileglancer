import * as React from 'react';
import { Link } from 'react-router-dom';
import { Typography, Popover } from '@material-tailwind/react';
import { EmptyPage, Folder, MoreVert } from 'iconoir-react';

import CustomCheckbox from './CustomCheckbox';
import FileListCrumbs from './FileListCrumbs';

import { File } from '../../hooks/useFileBrowser';
import { formatDate, formatFileSize } from '../../utils';

type FileListProps = {
  displayFiles: File[];
  currentPath: string;
  checked: string[];
  selectedZone: string | null;
  handleCheckboxToggle: (file: File) => void;
  getFiles: (path: string) => void;
  showFileDrawer: boolean;
  handleFileClick: (e: React.MouseEvent<HTMLDivElement>, file: File) => void;
  selectedFile: File | null;
};

const fileOptionLinks = [
  {
    title: 'Rename',
    href: '#'
  },
  {
    title: 'Copy Path',
    href: '#'
  },
  { title: 'Share', href: '#' },
  { title: 'View', href: '#' }
];

export default function FileList({
  displayFiles,
  currentPath,
  checked,
  selectedZone,
  handleCheckboxToggle,
  getFiles,
  showFileDrawer,
  handleFileClick,
  selectedFile
}: FileListProps): JSX.Element {
  console.log('Files to display in file list', displayFiles);

  return (
    <div
      className={`mx-2 transition-all duration-300 ${showFileDrawer ? 'mr-[350px]' : ''}`}
    >
      <FileListCrumbs
        currentPath={currentPath}
        selectedZone={selectedZone}
        getFiles={getFiles}
      />
      <div className="min-w-full bg-white">
        {/* Header row */}
        <div className="grid grid-cols-[minmax(200px,2fr)_minmax(85px,1fr)_minmax(100px,1fr)_minmax(75px,1fr)_20px] gap-4 p-0 text-gray-700">
          <div className="flex w-full gap-3 px-3 py-1">
            <div className="w-[3.75rem] h-5"></div>
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
            const labelId = `checkbox-list-label-${file.name}`;
            const isChecked = checked.includes(file.name);

            return (
              <div
                key={file.name}
                className={`grid grid-cols-[minmax(200px,2fr)_minmax(85px,1fr)_minmax(100px,1fr)_minmax(75px,1fr)_20px] gap-4 hover:bg-blue-100/50 ${index % 2 === 0 && !isChecked && file !== selectedFile && 'bg-gray-50'} ${(isChecked || file === selectedFile) && 'bg-blue-100/50'} `}
                onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                  handleFileClick(e, file)
                }
              >
                {/* Name column */}
                <div className="flex items-center w-full gap-3 pl-3 py-1  text-blue-500">
                  <div
                    className="cursor-pointer"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                      handleCheckboxToggle(file);
                    }}
                  >
                    <CustomCheckbox id={labelId} checked={isChecked} />
                  </div>

                  <Typography
                    variant="small"
                    className="font-medium cursor-pointer"
                    onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                      e.stopPropagation();
                      if (file.is_dir) {
                        getFiles(`${selectedZone}?subpath=${file.path}`);
                      }
                    }}
                  >
                    {file.name}
                  </Typography>
                </div>

                {/* Type column */}
                <div className="flex items-center w-full gap-3 py-1 text-grey-700 ">
                  {file.is_dir ? (
                    <Folder className="text-gray-700" />
                  ) : (
                    <EmptyPage className="text-gray-700" />
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

                {/* Actions column */}
                <Popover placement="left">
                  <Popover.Trigger>
                    <MoreVert />
                  </Popover.Trigger>

                  <Popover.Content>
                    <div className="flex flex-col gap-2">
                      {fileOptionLinks.map((link, index) => (
                        <Typography
                          as={Link}
                          to={link.href}
                          key={index}
                          className="text-sm p-1 cursor-pointer text-blue-500 hover:bg-blue-50/50 transition-colors"
                        >
                          {link.title}
                        </Typography>
                      ))}
                    </div>
                  </Popover.Content>
                </Popover>
              </div>
            );
          })}
      </div>
    </div>
  );
}
