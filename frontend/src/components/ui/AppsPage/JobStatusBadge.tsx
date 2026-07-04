import FgBadge from '@/components/designSystem/atoms/FgBadge';
import type { JobStatus } from '@/shared.types';

type StatusDisplay = {
  color: 'neutral' | 'info' | 'success' | 'error' | 'warning';
  label: string;
  dot?: boolean;
};

const STATUS_MAP: Record<string, StatusDisplay> = {
  PENDING: { color: 'neutral', label: 'Pending' },
  RUNNING: { color: 'info', label: 'Running', dot: true },
  DONE: { color: 'success', label: 'Done' },
  FAILED: { color: 'error', label: 'Failed' },
  KILLED: { color: 'warning', label: 'Killed' },
  UNKNOWN: { color: 'neutral', label: 'Unknown' }
};

export default function JobStatusBadge({
  status
}: {
  readonly status: JobStatus;
}) {
  // Future scheduler-specific statuses are shown neutrally rather than
  // mislabeled as failures.
  const { color, label, dot } = STATUS_MAP[status] ?? {
    color: 'neutral' as const,
    label: 'Unknown'
  };
  return (
    <FgBadge color={color} dot={dot} variant="pill">
      {label}
    </FgBadge>
  );
}
