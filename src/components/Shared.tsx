import React from 'react';
import { Typography } from '@material-tailwind/react';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import ProxiedPathRow from './ui/Shared/ProxiedPathRow';

export default function Shared() {
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  const { allProxiedPaths } = useProxiedPathContext();
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-4xl p-6">
        <Typography variant="h5" className="mb-6 text-foreground font-bold">
          Shared Paths
        </Typography>
        <div className="rounded-lg shadow bg-background">
          <div className="grid grid-cols-[0.8fr_2fr_2fr_1.5fr_0.5fr] gap-4 px-4 py-2 border-b border-surface">
            <div className="w-[100px]" /> {/* Intenionally empty cell */}
            <Typography variant="small" className="font-bold">
              Name
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
          {allProxiedPaths?.map(item => (
            <ProxiedPathRow
              item={item}
              menuOpenId={menuOpenId}
              setMenuOpenId={setMenuOpenId}
            />
          ))}
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
