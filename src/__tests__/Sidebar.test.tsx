import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';

import Sidebar from '@/components/ui/Sidebar/Sidebar';
import { render, screen, waitFor } from '@/__tests__/test-utils';

describe('Sidebar', () => {
  it('displays all zones initially', async () => {
    render(<Sidebar />);
    expect(await screen.findByText('Zone1')).toBeInTheDocument();
    expect(await screen.findByText('Zone2')).toBeInTheDocument();
  });

  it('filters zones', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(await screen.findByRole('searchbox'));
    await user.keyboard('1');

    expect(screen.getByText('Zone1')).toBeInTheDocument();
    expect(screen.queryByText('Zone 2')).not.toBeInTheDocument();
  });
});
