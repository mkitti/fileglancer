import { Typography } from '@material-tailwind/react';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import ProxiedPathRow from './ui/Shared/ProxiedPathRow';

// const mockShared: ProxiedPath[] = [
//   {
//     username: 'truhlara',
//     sharing_key: 'yuQ5vZmO',
//     sharing_name: 'fused-timeseries.zarr',
//     created_at: '2025-05-29T18:36:05.440539',
//     updated_at: '2025-05-29T18:36:05.440539',
//     fsp_mount_path: '/Users/truhlara/dev/fileglancer',
//     path: 'fused-timeseries.zarr'
//   },
//   {
//     username: 'truhlara',
//     sharing_key: 'abc12345',
//     sharing_name: 'experiment-data.zarr',
//     created_at: '2025-05-28T10:00:00.000000',
//     updated_at: '2025-05-28T10:00:00.000000',
//     fsp_mount_path: '/Users/truhlara/dev/fileglancer',
//     path: 'experiment-data.zarr'
//   }
// ];

export default function Shared() {
  const { allProxiedPaths } = useProxiedPathContext();
  console.log('All proxied paths:', allProxiedPaths);
  // const [sharedItems, setProxiedPaths] = React.useState<ProxiedPath[]>(() => [
  //   ...mockShared
  // ]);
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-4xl p-6">
        <Typography variant="h5" className="mb-6 text-foreground font-bold">
          Shared Paths
        </Typography>
        <div className="rounded-lg shadow bg-background overflow-x-auto">
          <div className="grid grid-cols-[2fr_2fr_1.5fr_0.5fr] gap-4 px-4 py-2 border-b border-surface">
            <Typography variant="small" className="font-bold">
              Sharing name
            </Typography>
            <Typography variant="small" className="font-bold">
              Mount path
            </Typography>
            <Typography variant="small" className="font-bold">
              Date shared
            </Typography>
            <Typography variant="small" className="font-bold text-center">
              Actions
            </Typography>
          </div>
          {allProxiedPaths?.map(item => <ProxiedPathRow item={item} />)}
          {allProxiedPaths?.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              No shared paths.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
