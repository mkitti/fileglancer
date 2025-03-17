import React from 'react';
import {
  BreadcrumbLink,
  Breadcrumb,
  Typography,
  BreadcrumbSeparator
} from '@material-tailwind/react';
import { NavArrowRight, Server } from 'iconoir-react';

type FileListCrumbsProps = {
  currentPath: string;
  selectedZone: string | null;
  getFiles: (path: string) => void;
};

export default function FileListCrumbs({
  currentPath,
  selectedZone,
  getFiles
}: FileListCrumbsProps): JSX.Element {
  const dirArray = currentPath.split('/').filter(item => item !== '');
  const dirDepth = dirArray.length;

  return (
    <div className="w-full py-2 px-3">
      <Breadcrumb className="bg-transparent p-0">
        <div
          className="flex items-center gap-1 rounded-md hover:bg-blue-50/50 transition-colors"
          onClick={() => getFiles('')}
        >
          <Server className="h-4 w-4 text-blue-500" />
          <NavArrowRight />
          <Typography variant="small" className="font-medium text-blue-500">
            {selectedZone}
          </Typography>
        </div>

        {/* Path segments */}
        {dirArray.map((item, index) => {
          // Render a breadcrumb link for each segment in the path
          return (
            <React.Fragment key={index}>
              {index === 0 && (
                <span className="inline-block mx-1 text-sm select-none pointer-events-none opacity-50 text-black dark:text-white">
                  /
                </span>
              )}
              <BreadcrumbLink
                variant="text"
                className="rounded-md  hover:bg-blue-50/50 transition-colors"
                onClick={() => getFiles(dirArray.slice(0, index + 1).join('/'))}
              >
                <Typography
                  variant="small"
                  className="font-medium text-blue-500"
                >
                  {item}
                </Typography>
              </BreadcrumbLink>

              {/* Add separator only if not the last segment */}
              {index < dirDepth - 1 && (
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
              )}
            </React.Fragment>
          );
        })}
      </Breadcrumb>
    </div>
  );
}
