import { describe, expect, it } from 'vitest';

import { isActiveJobStatus, isTerminalJobStatus } from '@/shared.types';

describe('job status helpers', () => {
  it('treats DONE, FAILED, KILLED, and CANCELLED as terminal', () => {
    for (const status of ['DONE', 'FAILED', 'KILLED', 'CANCELLED']) {
      expect(isTerminalJobStatus(status)).toBe(true);
      expect(isActiveJobStatus(status)).toBe(false);
    }
  });

  it('treats UNKNOWN and scheduler-specific statuses as active', () => {
    for (const status of ['PENDING', 'RUNNING', 'UNKNOWN', 'SUSPENDED']) {
      expect(isTerminalJobStatus(status)).toBe(false);
      expect(isActiveJobStatus(status)).toBe(true);
    }
  });

  it('does not poll before a status is known', () => {
    expect(isActiveJobStatus(undefined)).toBe(false);
    expect(isActiveJobStatus(null)).toBe(false);
  });
});
