import { Typography } from '@material-tailwind/react';
import { Metadata } from '../../../omezarr-helper';

type ZarrMetadataTableProps = {
  metadata: Metadata;
};

export default function ZarrMetadataTable({
  metadata
}: ZarrMetadataTableProps) {
  const { zarr_version, omero, shapes } = metadata;

  return (
    <div className="flex flex-col max-h-min">
      <Typography className="font-semibold text-sm my-2 text-surface-foreground">
        OME-Zarr metadata:
      </Typography>
      <table className="bg-background/90  ">
        <tbody className="text-sm">
          <tr className="border-y border-surface-dark">
            <td className="p-3 font-semibold">Zarr Version</td>
            <td className="p-3">{zarr_version}</td>
          </tr>
          <tr className="border-b border-surface-dark">
            <td className="p-3 font-semibold">Omero Metadata?</td>
            <td className="p-3">{omero ? 'Yes' : 'No'}</td>
          </tr>
          <tr className="border-b border-surface-dark">
            <td className="p-3 font-semibold">Shapes</td>
            <td className="p-3">
              {shapes
                ? shapes.map((shape, index) => (
                    <div key={index}>[{shape.join(', ')}]</div>
                  ))
                : 'None'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
