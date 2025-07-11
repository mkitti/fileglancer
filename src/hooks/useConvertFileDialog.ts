import { useState } from 'react';
import logger from '@/logger';

import {
  getFileBrowsePath,
  getFullPath,
  joinPaths,
  sendFetchRequest
} from '@/utils';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { useCookiesContext } from '@/contexts/CookiesContext';
import type { Result } from '@/shared.types';

export default function useConvertFileDialog() {
  const [destinationFolder, setDestinationFolder] = useState<string>('');

  const { currentFileSharePath, propertiesTarget } = useFileBrowserContext();
  const { cookies } = useCookiesContext();

  async function handleConvertFileSubmit(): Promise<Result<unknown, Error>> {
    if (!currentFileSharePath) {
      return { ok: false, error: new Error('No file share path selected') };
    } else if (!propertiesTarget) {
      return { ok: false, error: new Error('No properties target selected') };
    }

    const fetchPath = getFileBrowsePath(
      currentFileSharePath.name,
      propertiesTarget.path
    );

    const messagePath = joinPaths(
      currentFileSharePath.name,
      propertiesTarget.path
    );

    try {
      const checkPathResponse = await sendFetchRequest(
        fetchPath,
        'GET',
        cookies['_xsrf']
      );

      if (!checkPathResponse.ok && checkPathResponse.status === 404) {
        return {
          ok: false,
          error: new Error('File not found')
        };
      }

      const createTicketResponse = await sendFetchRequest(
        getFullPath('api/fileglancer/ticket'),
        'POST',
        cookies['_xsrf'],
        {
          fsp_name: currentFileSharePath.name,
          path: propertiesTarget.path,
          project_key: 'FT',
          issue_type: 'Task',
          summary: 'Convert file to ZARR',
          description: `Please convert ${messagePath} to a ZARR file.\nDestination folder: ${destinationFolder}`
        }
      );

      const ticketData = await createTicketResponse.json();

      if (createTicketResponse.ok && createTicketResponse.status === 200) {
        logger.info('Ticket created successfully:', ticketData);
        return {
          ok: true,
          value: ticketData
        };
      } else if (!createTicketResponse.ok) {
        logger.error('Error creating ticket:', ticketData.error);
        return {
          ok: false,
          error: new Error(`Error creating ticket: ${ticketData.error}`)
        };
      }
    } catch (error) {
      return {
        ok: false,
        error: new Error(
          `Unknown error creating ticket${error instanceof Error ? `: ${error.message}` : ''}`
        )
      };
    }
    return { ok: true, value: null };
  }

  return {
    handleConvertFileSubmit,
    destinationFolder,
    setDestinationFolder
  };
}
