import { describe, it, expect } from 'vitest';
import { getDatasetWarnings } from '@/omezarr-helper';
import type { Metadata } from '@/omezarr-helper';

// Minimal stand-in for the parts of Metadata the checks read. Codec info is
// left out by default, which the chunk check treats as compressed.
const createMetadata = (
  chunks: number[],
  dtype = 'uint16',
  extra: Partial<Metadata> = {},
  shape: number[] = [8, 8, 8]
): Metadata =>
  ({
    arr: { chunks, dtype, shape },
    ...extra
  }) as unknown as Metadata;

const axes = (...names: string[]): Partial<Metadata> => ({
  multiscales: [
    { axes: names.map(name => ({ name, type: 'space' })), datasets: [{}, {}] }
  ] as unknown as Metadata['multiscales']
});

const levels = (count: number): Partial<Metadata> => ({
  multiscales: [
    { datasets: Array.from({ length: count }, () => ({})) }
  ] as unknown as Metadata['multiscales']
});

// zstd nested inside a sharding_indexed pipeline, as a sharded v3 array stores it.
const SHARDED_ZSTD: Partial<Metadata> = {
  codecs: [
    {
      name: 'sharding_indexed',
      configuration: { codecs: [{ name: 'bytes' }, { name: 'zstd' }] }
    }
  ]
};
const UNCOMPRESSED_V3: Partial<Metadata> = {
  codecs: [{ name: 'bytes' }, { name: 'crc32c' }]
};

describe('getDatasetWarnings: chunk size', () => {
  it('says nothing about reasonable chunks', () => {
    expect(getDatasetWarnings(createMetadata([64, 64, 64]))).toEqual([]);
  });

  it('does not warn about a compressed 16 MB chunk', () => {
    // raw/s2: 16 MB inner chunks that zstd takes to ~12 MB on disk.
    expect(
      getDatasetWarnings(
        createMetadata([8, 128, 128, 128], 'uint8', SHARDED_ZSTD)
      )
    ).toEqual([]);
  });

  it('holds an uncompressed array to the stricter limit', () => {
    // The same 16 MB chunks, but stored raw, so 16 MB is what transfers.
    for (const raw of [UNCOMPRESSED_V3, { compressor: null }]) {
      expect(
        getDatasetWarnings(createMetadata([8, 128, 128, 128], 'uint8', raw))
      ).toEqual([
        { case: 'zarr-large-chunks', size: '16 MB', compressed: false }
      ]);
    }
  });

  it('finds a compressor nested inside a sharding codec', () => {
    // sharding_indexed is structural, so a flat scan would call this
    // uncompressed and warn at 16 MB.
    expect(
      getDatasetWarnings(
        createMetadata([8, 128, 128, 128], 'uint8', SHARDED_ZSTD)
      )
    ).toEqual([]);
  });

  it('assumes compressed when codec metadata was never fetched', () => {
    // Unknown lands on the permissive limit: a missed warning beats a false one.
    expect(
      getDatasetWarnings(createMetadata([8, 128, 128, 128], 'uint8'))
    ).toEqual([]);
  });

  it('warns above the compressed limit', () => {
    // seed151 img: 128 MB chunks.
    expect(
      getDatasetWarnings(createMetadata([256, 256, 256, 8], 'uint8'))
    ).toEqual([
      { case: 'zarr-large-chunks', size: '128 MB', compressed: true }
    ]);
  });

  it('accounts for the dtype width', () => {
    expect(getDatasetWarnings(createMetadata([256, 256, 256]))).toEqual([]);
    expect(
      getDatasetWarnings(createMetadata([256, 256, 256], 'float64'))
    ).toHaveLength(1);
  });
});

describe('getDatasetWarnings: resolution levels', () => {
  const BIG = [3000, 3000, 1350, 8]; // 91 GB of uint8, the seed151 img extent

  it('warns when multiscales declares a single level for a large image', () => {
    expect(
      getDatasetWarnings(createMetadata([64, 64, 64], 'uint8', levels(1), BIG))
    ).toEqual([{ case: 'zarr-single-level', size: '91 GB' }]);
  });

  it('says nothing when the pyramid has levels', () => {
    expect(
      getDatasetWarnings(createMetadata([64, 64, 64], 'uint8', levels(5), BIG))
    ).toEqual([]);
  });

  it('says nothing about a small single-level image', () => {
    expect(
      getDatasetWarnings(
        createMetadata([64, 64, 64], 'uint8', levels(1), [256, 256, 256])
      )
    ).toEqual([]);
  });

  it('never fires on a plain array, however large', () => {
    // The bug that made this warn on raw/s2: a plain array also has one shape,
    // but it declares no multiscales and so claims nothing.
    expect(
      getDatasetWarnings(createMetadata([64, 64, 64], 'uint8', {}, BIG))
    ).toEqual([]);
  });
});

describe('getDatasetWarnings: axis order', () => {
  it('accepts spec order', () => {
    for (const names of [
      ['t', 'c', 'z', 'y', 'x'],
      ['c', 'z', 'y', 'x'],
      ['z', 'y', 'x'],
      ['y', 'x']
    ]) {
      expect(
        getDatasetWarnings(
          createMetadata([64, 64, 64], 'uint16', axes(...names))
        )
      ).toEqual([]);
    }
  });

  it('warns about the seed151 c,x,y,z order', () => {
    expect(
      getDatasetWarnings(
        createMetadata([64, 64, 64, 8], 'uint8', axes('c', 'x', 'y', 'z'))
      )
    ).toEqual([
      {
        case: 'zarr-axis-order',
        axisOrder: 'C, X, Y, Z',
        expectedOrder: 'C, Z, Y, X'
      }
    ]);
  });

  it('warns when the channel axis trails the spatial axes', () => {
    expect(
      getDatasetWarnings(
        createMetadata([64, 64, 64, 8], 'uint8', axes('x', 'y', 'z', 'c'))
      )
    ).toEqual([
      {
        case: 'zarr-axis-order',
        axisOrder: 'X, Y, Z, C',
        expectedOrder: 'C, Z, Y, X'
      }
    ]);
  });

  it('is case insensitive', () => {
    expect(
      getDatasetWarnings(
        createMetadata([64, 64, 64], 'uint16', axes('Z', 'Y', 'X'))
      )
    ).toEqual([]);
  });

  it('stays quiet about custom axes it cannot judge', () => {
    expect(
      getDatasetWarnings(
        createMetadata([64, 64, 64], 'uint16', axes('c', 'angle', 'y', 'x'))
      )
    ).toEqual([]);
  });

  it('stays quiet about a plain array with no axes', () => {
    expect(getDatasetWarnings(createMetadata([64, 64, 64]))).toEqual([]);
  });
});
