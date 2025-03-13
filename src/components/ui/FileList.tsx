import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Drawer,
  IconButton,
  Typography,
  Popover,
  Tabs
} from '@material-tailwind/react';
import { CustomCheckbox } from './CustomCheckbox';
import { EmptyPage, Folder, InfoCircle, MoreVert, Xmark } from 'iconoir-react';

import { File } from '../../hooks/useFileBrowser';
import { formatDate, formatFileSize } from '../../utils';

import FileListCrumbs from './FileListCrumbs';
import FilePermissionTable from './FilePermissionTable';
import FileOverviewTable from './FileOverviewTable';

type FileListProps = {
  files: File[];
  currentPath: string;
  checked: string[];
  handleCheckboxToggle: (file: File) => void;
  getFiles: (path: string) => void;
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
  files,
  currentPath,
  checked,
  handleCheckboxToggle,
  getFiles
}: FileListProps): JSX.Element {
  return (
    <div className="mx-2">
      <FileListCrumbs currentPath={currentPath} getFiles={getFiles} />
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
        {files.length > 0 &&
          files.map((file, index) => {
            const labelId = `checkbox-list-label-${file.name}`;
            const isChecked = checked.includes(file.name);

            return (
              <div
                key={file.name}
                className={`grid grid-cols-[minmax(200px,2fr)_minmax(85px,1fr)_minmax(100px,1fr)_minmax(75px,1fr)_20px] gap-4 hover:bg-blue-100/50 ${index % 2 === 0 && !isChecked && 'bg-gray-50'} ${isChecked && 'bg-blue-100/50'} `}
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
                  <Drawer>
                    <Drawer.Trigger
                      as={IconButton}
                      size="sm"
                      color="secondary"
                      variant="ghost"
                      isCircular
                    >
                      <InfoCircle className="text-gray-700 h-5 w-5" />
                    </Drawer.Trigger>
                    <Drawer.Overlay>
                      <Drawer.Panel>
                        <div className="flex items-center justify-between gap-4">
                          <Typography type="h6">Properties</Typography>
                          <Drawer.DismissTrigger
                            as={IconButton}
                            size="sm"
                            variant="ghost"
                            color="secondary"
                            className="absolute right-2 top-2"
                            isCircular
                          >
                            <Xmark className="h-5 w-5" />
                          </Drawer.DismissTrigger>
                        </div>
                        <Tabs defaultValue="overview">
                          <Tabs.List className="w-full rounded-none border-b border-secondary-dark bg-transparent py-0">
                            <Tabs.Trigger className="w-full" value="overview">
                              Overview
                            </Tabs.Trigger>

                            <Tabs.Trigger
                              className="w-full"
                              value="permissions"
                            >
                              Permissions
                            </Tabs.Trigger>

                            <Tabs.Trigger className="w-full" value="convert">
                              Convert
                            </Tabs.Trigger>
                            <Tabs.TriggerIndicator className="rounded-none border-b-2 border-primary bg-transparent shadow-none" />
                          </Tabs.List>

                          <Tabs.Panel value="overview">
                            <FileOverviewTable file={file} />
                          </Tabs.Panel>

                          <Tabs.Panel value="permissions">
                            <FilePermissionTable file={file} />
                          </Tabs.Panel>

                          <Tabs.Panel value="convert">
                            <Typography variant="small" className="font-medium">
                              Convert data to OME-Zarr
                            </Typography>
                          </Tabs.Panel>
                        </Tabs>
                      </Drawer.Panel>
                    </Drawer.Overlay>
                  </Drawer>

                  <Typography
                    variant="small"
                    className="font-medium cursor-pointer"
                    onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                      e.stopPropagation();
                      if (file.is_dir) {
                        getFiles(file.path);
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
