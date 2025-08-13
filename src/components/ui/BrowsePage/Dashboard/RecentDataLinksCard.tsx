import { Typography } from '@material-tailwind/react';

import DashboardCard from '@/components/ui/BrowsePage/Dashboard/FgDashboardCard';
import ProxiedPathRow from '@/components/ui/LinksPage/ProxiedPathRow';
import { TableRow } from '@/components/ui/widgets/TableCard';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';

export default function RecentDataLinksCard() {
  const { allProxiedPaths } = useProxiedPathContext();

  // Get the 10 most recent data links
  const recentDataLinks = allProxiedPaths?.slice(0, 10) || [];

  return (
    <DashboardCard title="Recently created data links">
      {recentDataLinks.length === 0 ? (
        <div className="text-center py-8">
          <Typography variant="small" className="text-muted-foreground">
            No data links created yet
          </Typography>
        </div>
      ) : (
        recentDataLinks.map(proxiedPath => (
          <TableRow
            gridColsClass="grid-cols-[1.5fr_2.5fr_1.5fr_1fr]"
            key={proxiedPath.sharing_key}
          >
            <ProxiedPathRow key={proxiedPath.sharing_key} item={proxiedPath} />
          </TableRow>
        ))
      )}
    </DashboardCard>
  );
}
