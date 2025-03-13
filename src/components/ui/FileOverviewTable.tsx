import React from 'react';
import { File } from '../../hooks/useFileBrowser';
import { formatDate, formatFileSize } from '../../utils';

type FileOverviewTableProps = {
  file: File;
};

export default function FileOverviewTable({ file }: FileOverviewTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-200 mt-4">
      <table className="w-full">
        <tbody className="text-sm">
          <tr className="border-b border-gray-200">
            <td className="p-3 border-b border-surface bg-surface-light text-sm text-foreground dark:bg-surface-dark font-medium">
              Last modified
            </td>
            <td className="p-3 ">{formatDate(file.last_modified)}</td>
          </tr>
          <tr className="border-b border-gray-200">
            <td className="p-3 border-b border-surface bg-surface-light text-sm text-foreground dark:bg-surface-dark font-medium">
              Size
            </td>
            <td className="p-3 ">
              {file.is_dir ? '—' : formatFileSize(file.size)}
            </td>
          </tr>
          <tr className="border-b border-gray-200">
            <td className="p-3 border-b border-surface bg-surface-light text-sm text-foreground dark:bg-surface-dark font-medium">
              Type
            </td>
            <td className="p-3 ">{file.is_dir ? 'Folder' : 'File'}</td>
          </tr>
          <tr className="border-b border-gray-200">
            <td className="p-3 border-b border-surface bg-surface-light text-sm text-foreground dark:bg-surface-dark font-medium">
              Metadata
            </td>
            <td className="p-3 ">Pull from file...</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
