import { Typography } from '@material-tailwind/react';

import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import ProxiedPathRow from './ui/LinksPage/ProxiedPathRow';
import { TableCard } from './ui/widgets/TableCard';

export default function Links() {
  const { allProxiedPaths } = useProxiedPathContext();

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
      <TableCard
        gridColsClass="grid-cols-[1.5fr_2.5fr_1.5fr_1fr]"
        rowTitles={['Name', 'File Path', 'Date Created', 'Actions']}
        rowContent={ProxiedPathRow}
        items={allProxiedPaths}
        emptyMessage="No shared paths."
      />
    </>
  );
}
