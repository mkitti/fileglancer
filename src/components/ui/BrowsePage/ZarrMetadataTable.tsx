import * as zarr from 'zarrita';
import { Axis, Multiscale } from 'ome-zarr.js';
import { Metadata, translateUnitToNeuroglancer } from '../../../omezarr-helper';

type ZarrMetadataTableProps = {
  metadata: Metadata;
};

function getAxesString(multiscale: Multiscale) {
  return multiscale.axes.map((axis: Axis) => axis.name.toUpperCase()).join('');
}

function getSizeString(shapes: number[][] | undefined) {
  return shapes?.[0]?.join(', ') || 'Unknown';
}

function getChunkSizeString(arr: zarr.Array<any>) {
  return arr.chunks.join(', ');
}

function getDataTypeString(arr: zarr.Array<any>) {
  return arr.dtype;
}

/**
 * Find and return the first scale transform from the given coordinate transformations.
 * @param coordinateTransformations - List of coordinate transformations
 * @returns The first transform with type "scale", or undefined if no scale transform is found
 */
function getScaleTransform(coordinateTransformations: any[]) {
  return coordinateTransformations?.find(
    (ct: any) => ct.type === "scale"
  ) as { scale: number[] };
}

/**
 * Get the voxel size for the multiscale dataset, formatted as a comma-separated string.
 * @param multiscale - The multiscale metadata
 * @returns The voxel size string, or 'Unknown' if the voxel size cannot be determined
 */
function getUnitSizeString(multiscale: Multiscale) {
  try {
    // Get the root transform
    const rct = getScaleTransform(multiscale.coordinateTransformations as any[]);
    // Get the transform for the full scale dataset
    const dataset = multiscale.datasets[0]
    let ct = getScaleTransform(dataset.coordinateTransformations);
    if (ct === undefined) {
      return 'Unknown';
    }
    // Multiply the scale by the root transform scale
    const fct = ct.scale.map((value: number, i: number) => value * (rct?.scale[i] || 1))
    // Add the units to each scale value
    const units = multiscale.axes.map(axis => translateUnitToNeuroglancer(axis.unit as string));
    const quantities = fct.map((value: number, i: number) => {
      return units[i] ? `${value} ${units[i]}` : `${value}`;
    });
    // Format the voxel size as a comma-separated string
    return quantities.join(', ');
  } 
  catch (error) {
    return 'Unknown';
  }
}

export default function ZarrMetadataTable({
  metadata
}: ZarrMetadataTableProps) {
  const { zarr_version, multiscale, omero, shapes } = metadata;
  return (
    <div className="flex flex-col max-h-min">
      <table className="bg-background/90">
        <tbody className="text-sm">
          <tr className="border-y border-surface-dark">
            <td className="p-3 font-semibold" colSpan={2}>
              {multiscale ? 'OME-Zarr Metadata' : 'Zarr Array Metadata'}
            </td>
          </tr>
          <tr className="border-y border-surface-dark">
            <td className="p-3 font-semibold">Zarr Version</td>
            <td className="p-3">{zarr_version}</td>
          </tr>
          {metadata.arr ? (
            <tr className="border-b border-surface-dark">
              <td className="p-3 font-semibold">Data Type</td>
              <td className="p-3">{getDataTypeString(metadata.arr)}</td>
            </tr>
          ) : null}
          {multiscale?.axes ? (
            <tr className="border-b border-surface-dark">
              <td className="p-3 font-semibold">Axes</td>
              <td className="p-3">{getAxesString(multiscale)}</td>
            </tr>
          ) : null}
          {shapes ? (
            <tr className="border-b border-surface-dark">
              <td className="p-3 font-semibold">Shape</td>
              <td className="p-3">{getSizeString(shapes)}</td>
            </tr>
          ) : null}
          {metadata.arr ? (
            <>
              <tr className="border-b border-surface-dark">
                <td className="p-3 font-semibold">Chunk Size</td>
                <td className="p-3">{getChunkSizeString(metadata.arr)}</td>
              </tr>
            </>
          ) : null}
          {multiscale ? (
            <tr className="border-b border-surface-dark">
              <td className="p-3 font-semibold">Unit Sizes</td>
              <td className="p-3">{getUnitSizeString(multiscale)}</td>
            </tr>
          ) : null}
          {multiscale && shapes ? (
            <tr className="border-b border-surface-dark">
              <td className="p-3 font-semibold">Multiscale Levels</td>
              <td className="p-3">{shapes.length}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
