import React from 'react';
import { default as log } from '@/logger';

export default function useCopyPath() {
  const [copiedText, setCopiedText] = React.useState({
    value: '',
    isCopied: false
  });
  const [showCopyAlert, setShowCopyAlert] = React.useState(false);

  const copyToClipboard = async (path: string | null) => {
    if (path) {
      try {
        await navigator.clipboard.writeText(path);
        setCopiedText({
          value: path,
          isCopied: true
        });
        setShowCopyAlert(true);
      } catch (error) {
        log.error('Failed to copy to clipboard:', error);
        setCopiedText({
          value: path,
          isCopied: false
        });
      }
    }
  };

  const dismissCopyAlert = () => {
    setShowCopyAlert(false);
  };

  return {
    copiedText,
    showCopyAlert,
    setShowCopyAlert,
    copyToClipboard,
    dismissCopyAlert
  };
}
