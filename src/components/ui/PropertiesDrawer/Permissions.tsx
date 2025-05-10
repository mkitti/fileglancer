import * as React from 'react';
import { Button } from '@material-tailwind/react';
import type { File } from '../../../shared.types';
import PermissionsTable from './PermissionsTable';

interface PermissionsProps {
  file: File;
}

export default function Permissions({ file }: PermissionsProps) {
  return (
    <div className="flex flex-col gap-2">
      <PermissionsTable file={file} />
      <Button as="a" href="#" variant="outline">
        Change Permissions
      </Button>
    </div>
  );
} 