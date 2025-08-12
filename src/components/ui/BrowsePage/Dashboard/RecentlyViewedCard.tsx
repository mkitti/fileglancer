import DashboardCard from '@/components/ui/BrowsePage/Dashboard/FgDashboardCard';
import Folder from '@/components/ui/Sidebar/Folder';
import FileSharePathComponent from '@/components/ui/Sidebar/FileSharePath';
import { useZoneAndFspMapContext } from '@/contexts/ZonesAndFspMapContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import { makeMapKey } from '@/utils';
import type { FileSharePath } from '@/shared.types';

export default function RecentlyViewedCard() {
  const { zonesAndFileSharePathsMap } = useZoneAndFspMapContext();
  const { recentlyViewedFolders } = usePreferencesContext();

  return (
    <DashboardCard title="Recently viewed">
      <ul>
        {recentlyViewedFolders.map((item, index) => {
          const fspKey = makeMapKey('fsp', item.fspName);
          const fsp = zonesAndFileSharePathsMap[fspKey] as FileSharePath;

          // If path is ".", it's a file share path
          if (item.folderPath === '.') {
            return (
              <FileSharePathComponent
                key={`${item.fspName}-${index}`}
                fsp={fsp}
                isFavoritable={false}
              />
            );
          } else {
            // Otherwise, it's a folder
            return (
              <Folder
                key={`${item.fspName}-${item.folderPath}-${index}`}
                fsp={fsp}
                folderPath={item.folderPath}
                isFavoritable={false}
              />
            );
          }
        })}
      </ul>
    </DashboardCard>
  );
}
