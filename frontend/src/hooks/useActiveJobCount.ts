import { useJobsQuery } from '@/queries/jobsQueries';
import { isActiveJobStatus } from '@/shared.types';

export function useActiveJobCount(): number {
  const { data: jobs } = useJobsQuery();
  if (!jobs) {
    return 0;
  }
  return jobs.filter(j => isActiveJobStatus(j.status)).length;
}
