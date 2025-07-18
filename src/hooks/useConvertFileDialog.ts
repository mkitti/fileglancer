import React from 'react';

export default function useConvertFileDialog() {
  const [destinationFolder, setDestinationFolder] = React.useState<string>('');

  return {
    destinationFolder,
    setDestinationFolder
  };
}
