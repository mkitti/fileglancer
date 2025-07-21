import { Typography } from '@material-tailwind/react';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import ProxiedPathRow from './ui/Shared/ProxiedPathRow';

export default function Shared() {
  const { allProxiedPaths } = useProxiedPathContext();

  return (
    <>
      <Typography type="h5" className="mb-6 text-foreground font-bold">
        Shared Paths
      </Typography>
      <div className="rounded-lg shadow bg-background">
        <div className="grid grid-cols-[1.5fr_2.5fr_1.5fr_1fr] gap-4 px-4 py-2 border-b border-surface">
          <Typography className="font-bold">Name</Typography>
          <Typography className="font-bold">Path</Typography>
          <Typography className="font-bold">Date shared</Typography>
          <Typography className="font-bold">Actions</Typography>
        </div>
        {allProxiedPaths?.map(item => (
          <ProxiedPathRow item={item} />
        ))}
        {!allProxiedPaths || allProxiedPaths?.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No shared paths.
          </div>
        ) : null}
      </div>
    </>
  );
}
