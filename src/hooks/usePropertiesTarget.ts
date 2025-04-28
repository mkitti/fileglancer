import React from 'react';
import type { File, FileSharePathItem } from '../shared.types';

export default function usePropertiesTarget() {
  const [propertiesTarget, setPropertiesTarget] = React.useState<{
    targetFile: File | null;
    fileSharePath: FileSharePathItem | null;
  }>({ targetFile: null, fileSharePath: null });
  return {
    propertiesTarget,
    setPropertiesTarget
  };
}
