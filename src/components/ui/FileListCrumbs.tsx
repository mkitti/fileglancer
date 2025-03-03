import React from 'react';
import {
  BreadcrumbLink,
  Breadcrumb,
  Typography,
  BreadcrumbSeparator
} from '@material-tailwind/react';
import { NavArrowRight, Home } from 'iconoir-react';

interface FileListCrumbsProps {
  currentPath: string;
  getContents: (path?: string) => void;
}

export default function FileListCrumbs({
  currentPath,
  getContents
}: FileListCrumbsProps): JSX.Element {
  const dirArray = currentPath.split('/');
  const dirDepth = dirArray.length;

  return (
    <div className="w-full max-w-[360px] py-2 px-3">
      <Breadcrumb
        separator={<NavArrowRight className="h-4 w-4 text-blue-gray-500" />}
        className="bg-transparent p-0"
      >
        {/* Home crumb */}
        <BreadcrumbLink
          variant="text"
          className="flex items-center gap-1 p-1 rounded-md  hover:bg-blue-50/50 transition-colors"
          onClick={() => getContents(undefined)}
        >
          <Home className="h-4 w-4 text-blue-500" />
        </BreadcrumbLink>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>

        {/* Path segments */}
        {dirArray.map((item, index) => {
          // Render a breadcrumb link for each segment in the path
          return (
            <React.Fragment key={index}>
              <BreadcrumbLink
                variant="text"
                className="p-1 rounded-md  hover:bg-blue-50/50 transition-colors"
                onClick={() =>
                  getContents(dirArray.slice(0, index + 1).join('/'))
                }
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
