import { describe, expect, test } from 'vitest';
import { FaServer } from 'react-icons/fa6';
import { GoPackage } from 'react-icons/go';
import { IoTerminal } from 'react-icons/io5';

import {
  getAppIconType,
  getEntryPointIconType,
  getEntryPointTypeIconType
} from '@/utils/appIcons';

describe('app icon helpers', () => {
  test('uses a package icon for apps', () => {
    expect(getAppIconType()).toBe(GoPackage);
  });

  test('keeps entry point icons based on entry point type', () => {
    expect(getEntryPointTypeIconType('service')).toBe(FaServer);
    expect(getEntryPointTypeIconType('job')).toBe(IoTerminal);
    expect(
      getEntryPointIconType({
        id: 'serve',
        name: 'Serve',
        type: 'service',
        command: 'serve',
        parameters: []
      })
    ).toBe(FaServer);
  });
});
