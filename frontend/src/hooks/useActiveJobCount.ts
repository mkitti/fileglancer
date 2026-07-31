import { useActiveJobCountQuery } from '@/queries/jobsQueries';

export function useActiveJobCount(): number {
  const { data: count } = useActiveJobCountQuery();
  return count ?? 0;
}
