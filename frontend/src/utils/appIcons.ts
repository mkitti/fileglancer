import type { IconType } from 'react-icons';
import { FaServer } from 'react-icons/fa6';
import { GoPackage } from 'react-icons/go';
import { IoTerminal } from 'react-icons/io5';

import type { AppEntryPoint } from '@/shared.types';

/** Standard icon representing an app. */
export function getAppIconType(): IconType {
  return GoPackage;
}

/** Icon for an entry point type: a server for services, a terminal for batch jobs. */
export function getEntryPointTypeIconType(type?: 'job' | 'service'): IconType {
  return type === 'service' ? FaServer : IoTerminal;
}

/** Icon representing an entry point: a server for services, a terminal for batch jobs. */
export function getEntryPointIconType(entryPoint?: AppEntryPoint): IconType {
  return getEntryPointTypeIconType(entryPoint?.type);
}
