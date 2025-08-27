import * as zarr from 'zarrita';
import { Axis, Multiscale } from 'ome-zarr.js';
import { Metadata } from '../../../omezarr-helper';


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
            <tr className="border-b border-surface-dark">
              <td className="p-3 font-semibold">Data Type</td>
              <td className="p-3">{getDataTypeString(metadata.arr)}</td>
            </tr>
            </>
          ) : null}
          {multiscale && shapes ? (
            <tr className="border-b border-surface-dark">
              <td className="p-3 font-semibold">Mutliscale Levels</td>
              <td className="p-3">{shapes.length}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
