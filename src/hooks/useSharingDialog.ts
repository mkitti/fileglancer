import React from 'react';

export default function useSharingDialog() {
  const [showSharingDialog, setShowSharingDialog] =
    React.useState<boolean>(false);

  return {
    showSharingDialog,
    setShowSharingDialog
  };
}
