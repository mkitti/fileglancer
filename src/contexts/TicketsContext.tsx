import React from 'react';
import logger, { default as log } from '@/logger';
import { useCookiesContext } from '@/contexts/CookiesContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { useProfileContext } from './ProfileContext';
import { sendFetchRequest, joinPaths } from '@/utils';
import type { Result } from '@/shared.types';
import {
  createSuccess,
  getResponseError,
  handleError
} from '@/utils/errorHandling';

export type Ticket = {
  username: string;
  path: string;
  fsp_name: string;
  key: string;
  created: string;
  updated: string;
  status: string;
  resolution: string;
  description: string;
  link: string;
  comments: unknown[];
};

type TicketContextType = {
  ticket: Ticket | null;
  allTickets?: Ticket[];
  createTicket: (destination: string) => Promise<void>;
  fetchAllTickets: () => Promise<Result<Ticket[] | null>>;
  setAllTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
};

function sortTicketsByDate(tickets: Ticket[]): Ticket[] {
  return tickets.sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );
}

const TicketContext = React.createContext<TicketContextType | null>(null);

export const useTicketContext = () => {
  const context = React.useContext(TicketContext);
  if (!context) {
    throw new Error('useTicketContext must be used within a TicketProvider');
  }
  return context;
};

export const TicketProvider = ({ children }: { children: React.ReactNode }) => {
  const [allTickets, setAllTickets] = React.useState<Ticket[]>([]);
  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const { cookies } = useCookiesContext();
  const { fileBrowserState } = useFileBrowserContext();
  const { profile } = useProfileContext();

  const fetchAllTickets = React.useCallback(async (): Promise<
    Result<Ticket[] | null>
  > => {
    try {
      const response = await sendFetchRequest(
        '/api/fileglancer/ticket',
        'GET',
        cookies['_xsrf']
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.tickets) {
          return createSuccess(sortTicketsByDate(data.tickets) as Ticket[]);
        }
        // Not an error, just no tickets available
        return createSuccess(null);
      } else if (response.status === 404) {
        log.warn('No ticket found for the current file share path and target');
        // This is not an error, just no tickets available
        return createSuccess(null);
      } else {
        return await handleError(response);
      }
    } catch (error) {
      return await handleError(error);
    }
  }, [cookies]);

  const fetchTicket = React.useCallback(async (): Promise<
    Result<Ticket | null>
  > => {
    if (
      (!fileBrowserState.currentFileSharePath ||
        !fileBrowserState.propertiesTarget) &&
      !fileBrowserState.isFileBrowserReady
    ) {
      log.warn(
        'Cannot fetch ticket; no current file share path or file/folder selected'
      );
      // This is probably not an error, just the state before the file browser is ready
      return createSuccess(null);
    } else if (
      !fileBrowserState.currentFileSharePath ||
      !fileBrowserState.propertiesTarget
    ) {
      return await handleError(
        new Error(
          'File browser is ready but no file share path or properties target selected'
        )
      );
    }
    try {
      const response = await sendFetchRequest(
        `/api/fileglancer/ticket?fsp_name=${fileBrowserState.currentFileSharePath.name}&path=${fileBrowserState.propertiesTarget.path}`,
        'GET',
        cookies['_xsrf']
      );
      if (response.ok) {
        const data = (await response.json()) as any;
        log.debug('Fetched ticket:', data);
        if (data?.tickets) {
          return createSuccess(data.tickets[0] as Ticket);
        }
      }
      if (response.status === 404) {
        log.warn('No ticket found for the current file share path and target');
        // This is not an error, just no ticket available
        return createSuccess(null);
      } else {
        return await handleError(response);
      }
    } catch (error) {
      return await handleError(error);
    }
  }, [
    fileBrowserState.currentFileSharePath,
    fileBrowserState.propertiesTarget,
    fileBrowserState.isFileBrowserReady,
    cookies
  ]);

  async function createTicket(destinationFolder: string): Promise<void> {
    if (!fileBrowserState.currentFileSharePath) {
      throw new Error('No file share path selected');
    } else if (!fileBrowserState.propertiesTarget) {
      throw new Error('No properties target selected');
    }

    const messagePath = joinPaths(
      fileBrowserState.currentFileSharePath.mount_path,
      fileBrowserState.propertiesTarget.path
    );

    const createTicketResponse = await sendFetchRequest(
      '/api/fileglancer/ticket',
      'POST',
      cookies['_xsrf'],
      {
        fsp_name: fileBrowserState.currentFileSharePath.name,
        path: fileBrowserState.propertiesTarget.path,
        project_key: 'FT',
        issue_type: 'Task',
        summary: 'Convert file to ZARR',
        description: `Convert ${messagePath} to a ZARR file.\nDestination folder: ${destinationFolder}\nRequested by: ${profile?.username}`
      }
    );

    if (!createTicketResponse.ok) {
      const error = await getResponseError(createTicketResponse);
      throw new Error(error);
    }

    const ticketData = await createTicketResponse.json();

    logger.info('Ticket created successfully:', ticketData);
    setTicket(ticketData);
  }

  React.useEffect(() => {
    (async function () {
      const result = await fetchAllTickets();
      if (result.success) {
        setAllTickets(result.data || []);
      }
    })();
  }, [fetchAllTickets]);

  React.useEffect(() => {
    (async function () {
      const result = await fetchTicket();
      if (result.success) {
        setTicket(result.data);
      } else {
        setTicket(null);
      }
    })();
  }, [fetchTicket]);

  return (
    <TicketContext.Provider
      value={{
        ticket,
        allTickets,
        createTicket,
        fetchAllTickets,
        setAllTickets
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};

export default TicketContext;
