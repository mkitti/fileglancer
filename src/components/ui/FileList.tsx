import * as React from 'react';
import { Typography } from '@material-tailwind/react';
import { CustomCheckbox } from './CustomCheckbox';
import { EmptyPage, Folder, MoreVert } from 'iconoir-react';

import FileListCrumbs from './FileListCrumbs';
import useFileList from '../../hooks/useFileList';

export default function FileList(): JSX.Element {
  const { checked, files, currentPath, handleCheckboxToggle, getFiles } =
    useFileList();

  React.useEffect(() => {
    if (files.length === 0) {
      getFiles('');
    }
  }, [getFiles]);
  console.log('files:', files);

  return (
    <>
      <FileListCrumbs currentPath={currentPath} getFiles={getFiles} />
      <div className="min-w-full bg-white">
        {/* Header row */}
        <div className="grid grid-cols-5 gap-4 p-0 text-gray-700">
          <div className="flex w-full gap-3 px-3 py-1">
            <div className="w-5 h-5"></div>
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
                className={`grid grid-cols-5 gap-4 hover:bg-blue-50/50 ${isChecked && 'bg-blue-50/50'} ${index % 2 === 0 && 'bg-gray-50'}`}
              >
                {/* Name column */}
                <div className="flex items-center w-full gap-3 px-3 py-1  text-blue-500">
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
                        getFiles(file.path);
                      }
                    }}
                  >
                    {file.name}
                  </Typography>
                </div>

                {/* Type column */}
                <div className="flex items-center w-full gap-3 px-3 py-1 text-grey-700 ">
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
                <div className="px-3 py-1 text-grey-700  flex items-center">
                  <Typography variant="small" className="font-medium">
                    {file.last_modified}
                  </Typography>
                </div>

                {/* Size column */}
                <div className="px-3 py-1 text-grey-700 flex items-center">
                  <Typography variant="small" className="font-medium">
                    {file.size}
                  </Typography>
                </div>

                {/* Actions column */}
                <div className="flex items-center w-full gap-3 px-3 py-1 text-blue-500 cursor-pointer">
                  <MoreVert />
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
