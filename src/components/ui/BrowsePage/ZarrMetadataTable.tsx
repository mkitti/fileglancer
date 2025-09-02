import * as zarr from 'zarrita';
import { Axis } from 'ome-zarr.js';
import { Metadata, translateUnitToNeuroglancer } from '../../../omezarr-helper';

type ZarrMetadataTableProps = {
  metadata: Metadata;
};

function getSizeString(shapes: number[][] | undefined) {
  return shapes?.[0]?.join(', ') || 'Unknown';
}

function getChunkSizeString(arr: zarr.Array<any>) {
  return arr.chunks.join(', ');
}

/**
 * Find and return the first scale transform from the given coordinate transformations.
 * @param coordinateTransformations - List of coordinate transformations
 * @returns The first transform with type "scale", or undefined if no scale transform is found
 */
function getScaleTransform(coordinateTransformations: any[]) {
  return coordinateTransformations?.find((ct: any) => ct.type === 'scale') as {
    scale: number[];
  };
}

/**
 * Get axis-specific metadata for creating the second table
 * @param metadata - The Zarr metadata
 * @returns Array of axis data with name, shape, chunk size, scale, and unit
 */
function getAxisData(metadata: Metadata) {
  const { multiscale, shapes, arr } = metadata;
  if (!multiscale?.axes || !shapes?.[0] || !arr) {
    return [];
  }

  try {
    // Get the root transform
    const rct = getScaleTransform(
      multiscale.coordinateTransformations as any[]
    );
    const rootScales = rct?.scale || [];

    // Get the transform for the full scale dataset
    const dataset = multiscale.datasets[0];
    const ct = getScaleTransform(dataset.coordinateTransformations);
    const scales = ct?.scale || [];

    return multiscale.axes.map((axis: Axis, index: number) => {
      const shape = shapes[0][index] || 'Unknown';
      const chunkSize = arr.chunks[index] || 'Unknown';
      const scale = scales[index]
        ? Number((scales[index] * (rootScales[index] || 1)).toFixed(4))
        : 'Unknown';
      const unit = translateUnitToNeuroglancer(axis.unit as string) || '';

      return {
        name: axis.name.toUpperCase(),
        shape,
        chunkSize,
        scale,
        unit
      };
    });
  } catch (error) {
    console.error('Error getting axis data: ', error);
    return [];
  }
}

export default function ZarrMetadataTable({
  metadata
}: ZarrMetadataTableProps) {
  const { zarr_version, multiscale, shapes } = metadata;
  const axisData = getAxisData(metadata);

  return (
    <div className="flex flex-col gap-4 max-h-min">
      {/* First table - General metadata */}
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
              <td className="p-3">{metadata.arr.dtype}</td>
            </tr>
          ) : null}
          {!metadata.multiscale && shapes ? (
            <tr className="border-b border-surface-dark">
              <td className="p-3 font-semibold">Shape</td>
              <td className="p-3">{getSizeString(shapes)}</td>
            </tr>
          ) : null}
          {!metadata.multiscale && metadata.arr ? (
            <>
              <tr className="border-b border-surface-dark">
                <td className="p-3 font-semibold">Chunk Size</td>
                <td className="p-3">{getChunkSizeString(metadata.arr)}</td>
              </tr>
            </>
          ) : null}
          {metadata.multiscale && shapes ? (
            <tr className="border-b border-surface-dark">
              <td className="p-3 font-semibold">Multiscale Levels</td>
              <td className="p-3">{shapes.length}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* Second table - Axis-specific metadata */}
      {axisData.length > 0 && (
        <table className="bg-background/90">
          <thead className="text-sm">
            <tr className="border-y border-surface-dark">
              <th className="p-3 font-semibold text-left">Axes</th>
              <th className="p-3 font-semibold text-left">Shape</th>
              <th className="p-3 font-semibold text-left">Chunk Size</th>
              <th className="p-3 font-semibold text-left">Scale</th>
              <th className="p-3 font-semibold text-left">Unit</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {axisData.map((axis, index) => (
              <tr key={axis.name} className="border-b border-surface-dark">
                <td className="p-3 text-center">{axis.name}</td>
                <td className="p-3 text-right">{axis.shape}</td>
                <td className="p-3 text-right">{axis.chunkSize}</td>
                <td className="p-3 text-right">{axis.scale}</td>
                <td className="p-3 text-left">{axis.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
