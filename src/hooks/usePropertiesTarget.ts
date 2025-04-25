import React from 'react';
import type { File } from '../shared.types';

export default function usePropertiesTarget() {
  const [propertiesTarget, setPropertiesTarget] = React.useState<{
    targetFile: File | null;
    fileSharePath: string | null;
  }>({ targetFile: null, fileSharePath: null });
  return {
    propertiesTarget,
    setPropertiesTarget
  };
}
