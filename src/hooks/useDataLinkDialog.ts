import React from 'react';

export default function useDataLinkDialog() {
  const [showDataLinkDialog, setShowDataLinkDialog] =
    React.useState<boolean>(false);

  return {
    showDataLinkDialog,
    setShowDataLinkDialog
  };
}
