import React from 'react';
import { Typography } from '@material-tailwind/react';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import ProxiedPathRow from './ui/Shared/ProxiedPathRow';

export default function Links() {
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
  const { allProxiedPaths } = useProxiedPathContext();

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-6xl p-6">
        <Typography variant="h5" className="mb-6 text-foreground font-bold">
          Data Links
        </Typography>
        <Typography variant="small" className="mb-6 text-foreground">
          Data links can be created for any Zarr folder in the file browser.
          They are used to open files in external viewers like Neuroglancer. You
          can share data links with internal collaborators.
        </Typography>
        <div className="rounded-lg shadow bg-background">
          <div className="grid grid-cols-[1.5fr_2.5fr_1.5fr_1fr] gap-4 px-4 py-2 border-b border-surface">
            <Typography variant="small" className="font-bold">
              Name
            </Typography>
            <Typography variant="small" className="font-bold">
              File Path
            </Typography>
            <Typography variant="small" className="font-bold">
              Date Created
            </Typography>
            <Typography variant="small" className="font-bold">
              Actions
            </Typography>
          </div>
          {allProxiedPaths?.map(item => (
            <ProxiedPathRow
              key={item.sharing_key}
              item={item}
              menuOpenId={menuOpenId}
              setMenuOpenId={setMenuOpenId}
            />
          ))}
          {!allProxiedPaths || allProxiedPaths?.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              You have not created any data links yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
