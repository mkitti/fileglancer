import { Typography } from '@material-tailwind/react';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import ProxiedPathRow from './ui/LinksPage/ProxiedPathRow';
import Loader from '@/components/ui/Loader';

export default function Links() {
  const { allProxiedPaths, loadingProxiedPaths } = useProxiedPathContext();

  return (
    <>
      <Typography type="h5" className="mb-6 text-foreground font-bold">
        Data Links
      </Typography>
      <Typography className="mb-6 text-foreground">
        Data links can be created for any Zarr folder in the file browser. They
        are used to open files in external viewers like Neuroglancer. You can
        share data links with internal collaborators.
      </Typography>
      <div className="rounded-lg shadow bg-background">
        <div className="grid grid-cols-[1.5fr_2.5fr_1.5fr_1fr] gap-4 px-4 py-2 border-b border-surface">
          <Typography className="font-bold">Name</Typography>
          <Typography className="font-bold">File Path</Typography>
          <Typography className="font-bold">Date Created</Typography>
          <Typography className="font-bold">Actions</Typography>
        </div>
        {loadingProxiedPaths ? (
          <div className="flex justify-center w-full py-4">
            <Loader text="Checking for data links..." />
          </div>
        ) : allProxiedPaths && allProxiedPaths.length > 0 ? (
          allProxiedPaths.map(item => (
            <ProxiedPathRow key={item.sharing_key} item={item} />
          ))
        ) : !allProxiedPaths || allProxiedPaths?.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No data links.
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
            There was an error loading data links.
          </div>
        )}
      </div>
    </>
  );
}
